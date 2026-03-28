import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, ChevronRight, Star, BookOpen } from 'lucide-react';
import { PDFViewer } from '@/components/PDFViewer';
import { CardSkeletonGrid } from '@/components/skeletons/CardSkeleton';
import { SearchInput } from '@/components/SearchInput';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => { fetchNotes(); }, []);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('class', { ascending: true })
        .order('subject', { ascending: true })
        .order('chapter_number', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[NotesPage] fetchNotes failed:', error);
        toast({ title: 'Error', description: 'Failed to load notes.', variant: 'destructive' });
        return;
      }
      if (data) setNotes(data as Note[]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.subject.toLowerCase().includes(q) ||
        String(n.chapter_number).includes(q)
    );
  }, [notes, searchQuery]);

  // Group: subject → chapter_number → notes[]
  const grouped = useMemo(() => {
    const map: Record<string, Record<number, Note[]>> = {};
    for (const note of filteredNotes) {
      if (!map[note.subject]) map[note.subject] = {};
      const ch = note.chapter_number ?? 0;
      if (!map[note.subject][ch]) map[note.subject][ch] = [];
      map[note.subject][ch].push(note);
    }
    // Sort subjects, then chapters
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([subject, chapters]) => ({
        subject,
        chapters: Object.entries(chapters)
          .map(([ch, files]) => ({ chapter: parseInt(ch), files }))
          .sort((a, b) => a.chapter - b.chapter),
      }));
  }, [filteredNotes]);

  const toggleSubject = (subject: string) => {
    setOpenSubjects((prev) => ({ ...prev, [subject]: !prev[subject] }));
  };

  const handleDownload = async (note: Note) => {
    try {
      let filePath = note.pdf_url;
      if (note.pdf_url.includes('storage/v1/object/public/notes/')) {
        filePath = note.pdf_url.split('storage/v1/object/public/notes/')[1];
      }
      filePath = decodeURIComponent(filePath);

      const { data, error } = await supabase.storage.from('notes').download(filePath);
      if (error || !data) throw new Error('Failed to download file');

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${note.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'Download Started', description: `${note.title} is being downloaded.` });
    } catch (err) {
      console.error('Download error:', err);
      toast({ title: 'Download Failed', description: 'Could not download the file.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Notes</h1>
          <p className="text-muted-foreground">Study materials organized by subject & chapter</p>
        </div>
        <CardSkeletonGrid count={4} variant="note" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in overflow-hidden">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Notes</h1>
        <p className="text-muted-foreground">Study materials organized by subject & chapter</p>
      </div>

      {notes.length > 0 && (
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by title, subject or chapter..."
          className="max-w-md"
        />
      )}

      {filteredNotes.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Notes Available</h3>
          <p className="text-muted-foreground">
            {notes.length === 0
              ? 'Notes will appear here once uploaded by admin.'
              : 'No notes match your search.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ subject, chapters }) => (
            <Collapsible
              key={subject}
              open={openSubjects[subject] !== false}
              onOpenChange={() => toggleSubject(subject)}
            >
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${openSubjects[subject] !== false ? 'rotate-90' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-3 pt-2 pl-2 sm:pl-4">
                  {chapters.map(({ chapter, files }) => (
                    <div key={chapter} className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        Chapter {chapter || '–'}
                        {files.some((f) => f.is_solution) && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Star className="w-3 h-3" /> Has Solutions
                          </Badge>
                        )}
                      </h4>
                      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                        {files.map((note) => (
                          <div key={note.id} className="dashboard-card p-3 group overflow-hidden">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-medium text-foreground text-sm truncate">{note.title}</h3>
                                  {note.is_solution && (
                                    <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0">
                                      <Star className="w-2.5 h-2.5" /> Solution
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="default" size="sm" className="flex-1 min-h-[44px]" onClick={() => setViewingNote(note)}>
                                <Eye className="w-4 h-4 mr-1.5" /> View
                              </Button>
                              <Button variant="outline" size="sm" className="flex-1 min-h-[44px]" onClick={() => handleDownload(note)}>
                                <Download className="w-4 h-4 mr-1.5" /> Download
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      {viewingNote && (
        <PDFViewer
          storagePath={viewingNote.pdf_url}
          title={viewingNote.title}
          subject={viewingNote.subject}
          className={viewingNote.class}
          onClose={() => setViewingNote(null)}
        />
      )}
    </div>
  );
}
