import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye } from 'lucide-react';
import { PDFViewer } from '@/components/PDFViewer';
import { CardSkeletonGrid } from '@/components/skeletons/CardSkeleton';
import { SearchInput } from '@/components/SearchInput';

interface Note {
  id: string;
  title: string;
  subject: string;
  class: string;
  pdf_url: string;
  created_at: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingNote, setViewingNote] = useState<Note | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    // RLS automatically filters by student's class
    const { data } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setNotes(data);
    }
    setIsLoading(false);
  };

  const uniqueSubjects = [...new Set(notes.map((n) => n.subject))];

  const filteredNotes = notes.filter((note) => {
    if (filterSubject && note.subject !== filterSubject) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        note.title.toLowerCase().includes(query) ||
        note.subject.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleDownload = (note: Note) => {
    const link = document.createElement('a');
    link.href = note.pdf_url;
    link.download = note.title;
    link.target = '_blank';
    link.click();
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

      {/* Search and Filters */}
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
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredNotes.map((note) => (
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
      )}

      {/* PDF Viewer Modal */}
      {viewingNote && (
        <PDFViewer
          url={viewingNote.pdf_url}
          title={viewingNote.title}
          onClose={() => setViewingNote(null)}
        />
      )}
    </div>
  );
}
