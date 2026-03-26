import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye } from 'lucide-react';
import { PDFViewer } from '@/components/PDFViewer';
import { CardSkeletonGrid } from '@/components/skeletons/CardSkeleton';
import { SearchInput } from '@/components/SearchInput';
import { useToast } from '@/hooks/use-toast';

interface Note {
  id: string;
  title: string;
  subject: string;
  class: string;
  pdf_url: string;
  created_at: string;
}

const PAGE_SIZE = 8;

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filterSubject, searchQuery]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[NotesPage] fetchNotes failed:', error);
        toast({
          title: 'Error',
          description: 'Failed to load notes. Please refresh.',
          variant: 'destructive',
        });
        return;
      }

      if (data) setNotes(data);
    } finally {
      setIsLoading(false);
    }
  };

  const uniqueSubjects = useMemo(() => [...new Set(notes.map((n) => n.subject))], [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (filterSubject && note.subject !== filterSubject) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return note.title.toLowerCase().includes(query) || note.subject.toLowerCase().includes(query);
      }
      return true;
    });
  }, [notes, filterSubject, searchQuery]);

  const visibleNotes = filteredNotes.slice(0, visibleCount);
  const hasMore = filteredNotes.length > visibleCount;

  const handleDownload = async (note: Note) => {
    try {
      let filePath = note.pdf_url;
      if (note.pdf_url.includes('storage/v1/object/public/notes/')) {
        filePath = note.pdf_url.split('storage/v1/object/public/notes/')[1];
      }
      filePath = decodeURIComponent(filePath);

      const { data, error } = await supabase.storage
        .from('notes')
        .download(filePath);

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
      toast({
        title: 'Download Failed',
        description: 'Could not download the file. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Notes</h1>
          <p className="text-muted-foreground">Download study materials organized by subject</p>
        </div>
        <CardSkeletonGrid count={4} variant="note" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Notes</h1>
        <p className="text-muted-foreground">Download study materials organized by subject</p>
      </div>

      {notes.length > 0 && (
        <div className="space-y-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search notes by title..."
            className="max-w-md"
          />

          {uniqueSubjects.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!filterSubject ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterSubject(null)}
              >
                All Subjects
              </Button>
              {uniqueSubjects.map((subject) => (
                <Button
                  key={subject}
                  variant={filterSubject === subject ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterSubject(filterSubject === subject ? null : subject)}
                >
                  {subject}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {filteredNotes.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Notes Available</h3>
          <p className="text-muted-foreground">
            {notes.length === 0
              ? 'Notes will appear here once uploaded by admin.'
              : 'No notes match your current filters.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {visibleNotes.map((note) => (
              <div key={note.id} className="dashboard-card group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                        {note.subject}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {note.class}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground truncate">{note.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => setViewingNote(note)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(note)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <Button variant="outline" className="h-12" onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}>
                Load More Notes
              </Button>
            </div>
          )}
        </>
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
