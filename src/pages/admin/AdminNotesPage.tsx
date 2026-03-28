import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  FileText, Plus, MoreVertical, Edit, Trash2, ExternalLink,
  Loader2, Star, BookOpen, ChevronRight, Filter, X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ClassSelect } from '@/components/ClassSelect';
import { SubjectSelect } from '@/components/SubjectSelect';
import { useAuth } from '@/lib/auth';
import { FileUploader } from '@/components/admin/FileUploader';
import { detectChapterNumber, detectIsSolution } from '@/lib/notesUtils';
import { Badge } from '@/components/ui/badge';
import { CLASSES } from '@/components/ClassSelect';
import { SUBJECTS } from '@/components/SubjectSelect';

interface Note {
  id: string;
  title: string;
  subject: string;
  class: string;
  chapter_number: number | null;
  is_solution: boolean;
  pdf_url: string;
  created_at: string;
}

const CHAPTER_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

export default function AdminNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [openClasses, setOpenClasses] = useState<Record<string, boolean>>({});
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    class: '',
    chapter_number: 1,
    is_solution: false,
    pdf_url: '',
  });

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => { fetchNotes(); }, []);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('class', { ascending: true })
        .order('subject', { ascending: true })
        .order('chapter_number', { ascending: true });

      if (error) {
        console.error('[AdminNotesPage] fetchNotes failed:', error);
        toast({ title: 'Error', description: 'Failed to load notes.', variant: 'destructive' });
        return;
      }
      if (data) setNotes(data as Note[]);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters
  const filteredNotes = useMemo(() => {
    let result = notes;
    if (filterClass) result = result.filter((n) => n.class === filterClass);
    if (filterSubject) result = result.filter((n) => n.subject === filterSubject);
    return result;
  }, [notes, filterClass, filterSubject]);

  // Group: class → subject → chapter → notes[]
  const grouped = useMemo(() => {
    const classMap: Record<string, Record<string, Record<number, Note[]>>> = {};
    for (const note of filteredNotes) {
      if (!classMap[note.class]) classMap[note.class] = {};
      if (!classMap[note.class][note.subject]) classMap[note.class][note.subject] = {};
      const ch = note.chapter_number ?? 0;
      if (!classMap[note.class][note.subject][ch]) classMap[note.class][note.subject][ch] = [];
      classMap[note.class][note.subject][ch].push(note);
    }

    return Object.entries(classMap)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([cls, subjects]) => ({
        class: cls,
        subjects: Object.entries(subjects)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([subject, chapters]) => ({
            subject,
            chapters: Object.entries(chapters)
              .map(([ch, files]) => ({ chapter: parseInt(ch), files }))
              .sort((a, b) => a.chapter - b.chapter),
          })),
      }));
  }, [filteredNotes]);

  const handleTitleChange = (title: string) => {
    const chapter = detectChapterNumber(title);
    const isSol = detectIsSolution(title);
    setFormData((prev) => ({
      ...prev,
      title,
      ...(chapter !== null ? { chapter_number: chapter } : {}),
      is_solution: isSol,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pdf_url) {
      toast({ title: 'Error', description: 'Please upload a PDF first.', variant: 'destructive' });
      return;
    }
    if (!formData.class || !formData.subject || !formData.title) {
      toast({ title: 'Error', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }

    setIsPublishing(true);
    try {
      const payload = {
        title: formData.title,
        subject: formData.subject,
        class: formData.class,
        chapter_number: formData.chapter_number,
        is_solution: formData.is_solution,
        pdf_url: formData.pdf_url,
      };

      if (editingNote) {
        const { error } = await supabase.from('notes').update(payload).eq('id', editingNote.id);
        if (error) {
          toast({ title: 'Error', description: 'Failed to update note.', variant: 'destructive' });
          return;
        }
        toast({ title: 'Success', description: 'Note updated successfully.' });
      } else {
        const { error } = await supabase.from('notes').insert({ ...payload, created_by: user?.id });
        if (error) {
          toast({ title: 'Error', description: 'Failed to add note.', variant: 'destructive' });
          return;
        }
        toast({ title: 'Success', description: 'Notes uploaded successfully.' });
      }
      await fetchNotes();
      resetForm();
    } finally {
      setIsPublishing(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (!window.confirm('Delete this note?')) return;
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete note.', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Note deleted successfully.' });
      fetchNotes();
    }
  };

  const resetForm = () => {
    setFormData({ title: '', subject: '', class: '', chapter_number: 1, is_solution: false, pdf_url: '' });
    setEditingNote(null);
    setIsDialogOpen(false);
  };

  const openEditDialog = (note: Note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      subject: note.subject,
      class: note.class,
      chapter_number: note.chapter_number ?? 1,
      is_solution: note.is_solution ?? false,
      pdf_url: note.pdf_url,
    });
    setIsDialogOpen(true);
  };

  const toggleClass = (cls: string) =>
    setOpenClasses((prev) => ({ ...prev, [cls]: prev[cls] === false ? true : prev[cls] === undefined ? false : !prev[cls] }));

  const toggleSubject = (key: string) =>
    setOpenSubjects((prev) => ({ ...prev, [key]: prev[key] === false ? true : prev[key] === undefined ? false : !prev[key] }));

  const hasFilters = filterClass || filterSubject;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Notes</h1>
          <p className="text-sm text-muted-foreground">
            {notes.length} note{notes.length !== 1 ? 's' : ''} • Organized by Class → Subject → Chapter
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (open) { setIsDialogOpen(true); } else if (!isPublishing) { resetForm(); } }}>
          <DialogTrigger asChild>
            <Button type="button" onClick={() => { resetForm(); setIsDialogOpen(true); }} className="w-full sm:w-auto min-h-[44px]">
              <Plus className="w-4 h-4 mr-2" /> Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6" onInteractOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="text-lg">{editingNote ? 'Edit Note' : 'Add New Note'}</DialogTitle>
              <DialogDescription>Fill in the details below. Chapter & solution type are auto-detected from the title.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Class *</Label>
                  <ClassSelect value={formData.class} onChange={(v) => setFormData({ ...formData, class: v })} required />
                </div>
                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <SubjectSelect value={formData.subject} onChange={(v) => setFormData({ ...formData, subject: v })} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g., Chapter 1 Motion Notes"
                  className="min-h-[44px]"
                  required
                />
                {formData.title && (
                  <p className="text-xs text-muted-foreground">
                    Auto-detected: Chapter {formData.chapter_number}
                    {formData.is_solution && ' • ⭐ Solution'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Chapter No. *</Label>
                  <Select
                    value={String(formData.chapter_number)}
                    onValueChange={(v) => setFormData({ ...formData, chapter_number: parseInt(v) })}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHAPTER_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>Chapter {n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.is_solution ? 'solution' : 'notes'}
                    onValueChange={(v) => setFormData({ ...formData, is_solution: v === 'solution' })}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notes">📄 Notes</SelectItem>
                      <SelectItem value="solution">⭐ Solution</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>PDF File</Label>
                <FileUploader
                  bucket="notes"
                  accept=".pdf"
                  maxSizeMB={10}
                  onUploadComplete={(url, fileName) => {
                    const newTitle = formData.title || fileName.replace(/\.pdf$/i, '');
                    const chapter = detectChapterNumber(newTitle);
                    const isSol = detectIsSolution(newTitle);
                    setFormData((prev) => ({
                      ...prev,
                      pdf_url: url,
                      title: prev.title || newTitle,
                      ...(chapter !== null && !prev.title ? { chapter_number: chapter } : {}),
                      ...(isSol && !prev.title ? { is_solution: true } : {}),
                    }));
                  }}
                  existingUrl={formData.pdf_url}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="submit" className="flex-1 min-h-[48px] text-base" disabled={!formData.pdf_url || isPublishing}>
                  {isPublishing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingNote ? 'Update Note' : 'Publish'}
                </Button>
                <Button type="button" variant="outline" className="min-h-[44px]" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      {notes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <div className="w-36">
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                {CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-36">
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <Button type="button" variant="ghost" size="sm" className="h-9 text-xs gap-1" onClick={() => { setFilterClass(''); setFilterSubject(''); }}>
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>
      )}

      {/* Grouped Notes */}
      {filteredNotes.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {notes.length === 0 ? 'No Notes Yet' : 'No Notes Match Filters'}
          </h3>
          <p className="text-muted-foreground">
            {notes.length === 0 ? 'Add study materials for students.' : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ class: cls, subjects }) => (
            <Collapsible
              key={cls}
              open={openClasses[cls] !== false}
              onOpenChange={() => toggleClass(cls)}
            >
              {/* Class Header */}
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-3 sm:p-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-foreground">{cls}</p>
                      <p className="text-xs text-muted-foreground">
                        {subjects.length} subject{subjects.length !== 1 ? 's' : ''} •{' '}
                        {subjects.reduce((sum, s) => sum + s.chapters.reduce((cs, c) => cs + c.files.length, 0), 0)} files
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${openClasses[cls] !== false ? 'rotate-90' : ''}`} />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="space-y-2 pt-2 pl-2 sm:pl-4">
                  {subjects.map(({ subject, chapters }) => {
                    const subjectKey = `${cls}::${subject}`;
                    return (
                      <Collapsible
                        key={subjectKey}
                        open={openSubjects[subjectKey] !== false}
                        onOpenChange={() => toggleSubject(subjectKey)}
                      >
                        {/* Subject Header */}
                        <CollapsibleTrigger asChild>
                          <button className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-card border border-border hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
                                <FileText className="w-4 h-4 text-accent-foreground" />
                              </div>
                              <div className="text-left">
                                <p className="font-semibold text-foreground text-sm">{subject}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${openSubjects[subjectKey] !== false ? 'rotate-90' : ''}`} />
                          </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="space-y-1.5 pt-1.5 pl-2 sm:pl-4">
                            {chapters.map(({ chapter, files }) => (
                              <div key={chapter} className="space-y-1">
                                <p className="text-xs font-semibold text-muted-foreground px-2 pt-1">
                                  Chapter {chapter || '–'}
                                </p>
                                {files.map((note) => (
                                  <div key={note.id} className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors group">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                      <span className="text-sm text-foreground truncate">{note.title}</span>
                                      {note.is_solution && (
                                        <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0 shrink-0">
                                          <Star className="w-2.5 h-2.5" /> Sol
                                        </Badge>
                                      )}
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-60 group-hover:opacity-100">
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => window.open(note.pdf_url, '_blank')}>
                                          <ExternalLink className="w-4 h-4 mr-2" /> View PDF
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openEditDialog(note)}>
                                          <Edit className="w-4 h-4 mr-2" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => deleteNote(note.id)} className="text-destructive">
                                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}
