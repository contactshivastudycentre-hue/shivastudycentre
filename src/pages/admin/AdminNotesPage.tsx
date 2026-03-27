import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Plus, MoreVertical, Edit, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ClassSelect } from '@/components/ClassSelect';
import { SubjectSelect } from '@/components/SubjectSelect';
import { useAuth } from '@/lib/auth';
import { FileUploader } from '@/components/admin/FileUploader';

interface Note {
  id: string;
  title: string;
  subject: string;
  class: string;
  chapter_number: number | null;
  pdf_url: string;
  created_at: string;
}

export default function AdminNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    class: '',
    chapter_number: 1,
    pdf_url: '',
  });

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchNotes();
  }, []);

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
    console.log('[AdminNotesPage] Note publish start:', formData);

    try {
      const payload = {
        title: formData.title,
        subject: formData.subject,
        class: formData.class,
        chapter_number: formData.chapter_number,
        pdf_url: formData.pdf_url,
      };

      if (editingNote) {
        const { error } = await supabase
          .from('notes')
          .update(payload)
          .eq('id', editingNote.id);

        if (error) {
          console.error('[AdminNotesPage] Update failed:', error);
          toast({ title: 'Error', description: 'Failed to update note.', variant: 'destructive' });
          return;
        }

        toast({ title: 'Success', description: 'Note updated successfully.' });
      } else {
        const { error } = await supabase
          .from('notes')
          .insert({ ...payload, created_by: user?.id });

        if (error) {
          console.error('[AdminNotesPage] Insert failed:', error);
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
    setFormData({ title: '', subject: '', class: '', chapter_number: 1, pdf_url: '' });
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
      pdf_url: note.pdf_url,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in px-1 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Notes</h1>
          <p className="text-sm text-muted-foreground">Manage study materials by class, subject & chapter</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="w-full sm:w-auto min-h-[44px]">
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg">{editingNote ? 'Edit Note' : 'Add New Note'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Class *</Label>
                  <ClassSelect
                    value={formData.class}
                    onChange={(value) => setFormData({ ...formData, class: value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <SubjectSelect
                    value={formData.subject}
                    onChange={(value) => setFormData({ ...formData, subject: value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="chapter">Chapter No. *</Label>
                  <Input
                    id="chapter"
                    type="number"
                    min={1}
                    max={50}
                    value={formData.chapter_number}
                    onChange={(e) => setFormData({ ...formData, chapter_number: parseInt(e.target.value) || 1 })}
                    className="min-h-[44px]"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Motion"
                    className="min-h-[44px]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>PDF File</Label>
                <FileUploader
                  bucket="notes"
                  accept=".pdf"
                  maxSizeMB={10}
                  onUploadComplete={(url, fileName) => {
                    console.log('[AdminNotesPage] Upload success:', fileName, url);
                    setFormData((prev) => ({
                      ...prev,
                      pdf_url: url,
                      title: prev.title || fileName.replace(/\.pdf$/i, ''),
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

      {notes.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Notes Yet</h3>
          <p className="text-muted-foreground">Add study materials for students.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mobile card list */}
          <div className="block sm:hidden space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="dashboard-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground text-sm truncate">
                      Ch. {note.chapter_number ?? '–'} – {note.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {note.class} • {note.subject}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8">
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
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block dashboard-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-medium text-muted-foreground">Ch.</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Title</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Subject</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Class</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map((note) => (
                    <tr key={note.id} className="border-b border-border last:border-0">
                      <td className="p-3 text-muted-foreground">{note.chapter_number ?? '–'}</td>
                      <td className="p-3 font-medium text-foreground">{note.title}</td>
                      <td className="p-3 text-muted-foreground">{note.subject}</td>
                      <td className="p-3 text-muted-foreground">{note.class}</td>
                      <td className="p-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
