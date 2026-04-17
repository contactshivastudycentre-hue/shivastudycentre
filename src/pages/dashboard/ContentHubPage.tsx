import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { FileText, Play, ClipboardList, ChevronRight, BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type Note = { id: string; subject: string; chapter_number: number | null };
type Video = { id: string; subject: string };
type Test = { id: string; subject: string };

const FALLBACK_SUBJECTS = ['Science', 'Math', 'English', 'SST', 'Hindi', 'Other'];

export default function ContentHubPage() {
  const { profile } = useAuth();
  const [activeSubject, setActiveSubject] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['content-hub', profile?.class],
    queryFn: async () => {
      const [notesRes, videosRes, testsRes] = await Promise.all([
        supabase.from('notes').select('id, subject, chapter_number'),
        supabase.from('videos').select('id, subject'),
        supabase.from('tests').select('id, subject').eq('is_published', true),
      ]);
      return {
        notes: (notesRes.data || []) as Note[],
        videos: (videosRes.data || []) as Video[],
        tests: (testsRes.data || []) as Test[],
      };
    },
    enabled: !!profile,
    staleTime: 30_000,
  });

  // Build subject list from real content + fallbacks
  const subjects = useMemo(() => {
    const set = new Set<string>();
    data?.notes.forEach((n) => set.add(n.subject));
    data?.videos.forEach((v) => set.add(v.subject));
    data?.tests.forEach((t) => set.add(t.subject));
    if (set.size === 0) FALLBACK_SUBJECTS.forEach((s) => set.add(s));
    return Array.from(set).sort();
  }, [data]);

  // Group by subject -> chapter
  const grouped = useMemo(() => {
    if (!data) return [];
    const filterSubj = (s: string) => !activeSubject || s === activeSubject;

    const map = new Map<string, Map<number, { notes: number; videos: number; tests: number }>>();

    data.notes.filter((n) => filterSubj(n.subject)).forEach((n) => {
      const ch = n.chapter_number ?? 0;
      if (!map.has(n.subject)) map.set(n.subject, new Map());
      const sub = map.get(n.subject)!;
      if (!sub.has(ch)) sub.set(ch, { notes: 0, videos: 0, tests: 0 });
      sub.get(ch)!.notes++;
    });
    // Videos and tests don't have chapter — bucket them under "Chapter 0" (General)
    data.videos.filter((v) => filterSubj(v.subject)).forEach((v) => {
      if (!map.has(v.subject)) map.set(v.subject, new Map());
      const sub = map.get(v.subject)!;
      if (!sub.has(0)) sub.set(0, { notes: 0, videos: 0, tests: 0 });
      sub.get(0)!.videos++;
    });
    data.tests.filter((t) => filterSubj(t.subject)).forEach((t) => {
      if (!map.has(t.subject)) map.set(t.subject, new Map());
      const sub = map.get(t.subject)!;
      if (!sub.has(0)) sub.set(0, { notes: 0, videos: 0, tests: 0 });
      sub.get(0)!.tests++;
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([subject, chapters]) => ({
        subject,
        chapters: Array.from(chapters.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([chapter, counts]) => ({ chapter, ...counts })),
      }));
  }, [data, activeSubject]);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-full rounded-xl" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-display font-bold text-foreground">Study Content</h1>
        <p className="text-sm text-muted-foreground">
          Notes, videos and tests for Class {profile?.class}
        </p>
      </div>

      {/* Subject filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
        <button
          type="button"
          onClick={() => setActiveSubject(null)}
          className={`shrink-0 px-4 h-10 rounded-full text-sm font-semibold transition-all active:scale-95 ${
            !activeSubject
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-card border border-border text-foreground hover:border-primary/40'
          }`}
        >
          All
        </button>
        {subjects.map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => setActiveSubject(s)}
            className={`shrink-0 px-4 h-10 rounded-full text-sm font-semibold transition-all active:scale-95 ${
              activeSubject === s
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-card border border-border text-foreground hover:border-primary/40'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Chapter cards grouped by subject */}
      {grouped.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No content available yet for this selection.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((subjectGroup) => (
            <div key={subjectGroup.subject} className="space-y-2">
              <h2 className="text-sm font-display font-bold text-foreground px-1 uppercase tracking-wide">
                {subjectGroup.subject}
              </h2>

              {subjectGroup.chapters.map(({ chapter, notes, videos, tests }) => (
                <Link
                  key={chapter}
                  to={notes > 0 ? '/dashboard/notes' : videos > 0 ? '/dashboard/videos' : '/dashboard/tests'}
                  className="block bg-card rounded-2xl border border-border p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-display font-bold shrink-0">
                      {chapter > 0 ? `C${chapter}` : '★'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold text-foreground">
                        {chapter > 0 ? `Chapter ${chapter}` : 'General'}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {notes > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            {notes} {notes === 1 ? 'Note' : 'Notes'}
                          </span>
                        )}
                        {videos > 0 && (
                          <span className="flex items-center gap-1">
                            <Play className="w-3.5 h-3.5" />
                            {videos} {videos === 1 ? 'Video' : 'Videos'}
                          </span>
                        )}
                        {tests > 0 && (
                          <span className="flex items-center gap-1">
                            <ClipboardList className="w-3.5 h-3.5" />
                            {tests} {tests === 1 ? 'Test' : 'Tests'}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
