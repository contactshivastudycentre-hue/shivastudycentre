import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink } from 'lucide-react';

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
  const [filter, setFilter] = useState<{ subject?: string; class?: string }>({});

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
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
  const uniqueClasses = [...new Set(notes.map((n) => n.class))];

  const filteredNotes = notes.filter((note) => {
    if (filter.subject && note.subject !== filter.subject) return false;
    if (filter.class && note.class !== filter.class) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading notes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Notes</h1>
        <p className="text-muted-foreground">Download study materials organized by subject</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={!filter.subject && !filter.class ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter({})}
        >
          All
        </Button>
        {uniqueSubjects.map((subject) => (
          <Button
            key={subject}
            variant={filter.subject === subject ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter({ ...filter, subject: filter.subject === subject ? undefined : subject })}
          >
            {subject}
          </Button>
        ))}
        {uniqueClasses.map((cls) => (
          <Button
            key={cls}
            variant={filter.class === cls ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter({ ...filter, class: filter.class === cls ? undefined : cls })}
          >
            {cls}
          </Button>
        ))}
      </div>

      {filteredNotes.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Notes Available</h3>
          <p className="text-muted-foreground">Check back later for study materials.</p>
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
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(note.pdf_url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = note.pdf_url;
                    link.download = note.title;
                    link.click();
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
