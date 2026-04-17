import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Play, ThumbsUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type VideoRow = {
  id: string;
  title: string;
  subject: string;
  thumbnail_url: string | null;
  video_url: string;
};

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([^&?/]+)/);
  return m ? m[1] : null;
}

function thumbFor(v: VideoRow): string | null {
  if (v.thumbnail_url) return v.thumbnail_url;
  const id = getYouTubeId(v.video_url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function TrendingContent() {
  const { profile } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['trending-videos', profile?.class],
    queryFn: async () => {
      // Top videos in the student's class — RLS already limits to their class
      const { data: videos } = await supabase
        .from('videos')
        .select('id, title, subject, thumbnail_url, video_url')
        .order('created_at', { ascending: false })
        .limit(10);
      if (!videos?.length) return [];

      // Fetch like counts in one go
      const ids = videos.map((v) => v.id);
      const { data: likes } = await supabase
        .from('video_likes')
        .select('video_id')
        .in('video_id', ids);

      const counts = new Map<string, number>();
      (likes || []).forEach((l) => counts.set(l.video_id, (counts.get(l.video_id) || 0) + 1));

      return (videos as VideoRow[])
        .map((v) => ({ ...v, likes: counts.get(v.id) || 0 }))
        .sort((a, b) => b.likes - a.likes)
        .slice(0, 8);
    },
    enabled: !!profile,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-5 w-36 mb-3" />
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="w-[180px] h-[140px] rounded-2xl shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.length) return null;

  return (
    <div>
      <h2 className="text-base font-display font-bold text-foreground mb-3 px-1">
        Trending Content
      </h2>
      <div
        className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
      >
        {data.map((v) => {
          const thumb = thumbFor(v);
          return (
            <Link
              key={v.id}
              to={`/dashboard/videos/${v.id}`}
              className="snap-start shrink-0 w-[180px] bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md hover:border-primary/40 transition-all active:scale-95"
            >
              <div className="relative aspect-video bg-muted">
                {thumb ? (
                  <img
                    src={thumb}
                    alt={v.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent" />
                <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3 text-white" />
                  <span className="text-[10px] font-medium text-white">{v.likes}</span>
                </div>
              </div>
              <div className="p-2.5">
                <p className="text-xs font-display font-semibold text-foreground line-clamp-2 leading-snug">
                  {v.title}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 truncate">{v.subject}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
