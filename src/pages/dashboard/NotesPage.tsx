import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, ChevronRight } from 'lucide-react';
import { PDFViewer } from '@/components/PDFViewer';
import { CardSkeletonGrid } from '@/components/skeletons/CardSkeleton';
import { SearchInput } from '@/components/SearchInput';
import { useToast } from '@/hooks/use-toast';
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

  // Group: subject → notes (already filtered by student's class via RLS)
  const groupedBySubject = useMemo(() => {
    const map: Record<string, Note[]> = {};
    for (const note of filteredNotes) {
      if (!map[note.subject]) map[note.subject] = [];
      map[note.subject].push(note);
    }
    // Sort subjects alphabetically
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
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
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Notes</h1>
        <p className="text-muted-foreground">Study materials organized by subject & chapter</p>
      </div>

      {notes.length > 0 && (
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by title or chapter..."
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
          {groupedBySubject.map(([subject, subjectNotes]) => (
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
                      <p className="text-xs text-muted-foreground">{subjectNotes.length} chapter{subjectNotes.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${openSubjects[subject] !== false ? 'rotate-90' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid gap-3 pt-2 sm:grid-cols-2">
                  {subjectNotes.map((note) => (
                    <div key={note.id} className="dashboard-card p-4 group">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-accent text-sm font-bold text-accent-foreground flex-shrink-0">
                          {note.chapter_number ?? '–'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground text-sm truncate">{note.title}</h3>
                          <p className="text-xs text-muted-foreground">Chapter {note.chapter_number ?? '–'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="default" size="sm" className="flex-1 min-h-[40px]" onClick={() => setViewingNote(note)}>
                          <Eye className="w-4 h-4 mr-1.5" /> View
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 min-h-[40px]" onClick={() => handleDownload(note)}>
                          <Download className="w-4 h-4 mr-1.5" /> Download
                        </Button>
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
