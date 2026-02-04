import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Play, ExternalLink } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  subject: string;
  class: string;
  video_url: string;
  thumbnail_url: string | null;
  created_at: string;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<{ subject?: string; class?: string }>({});
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    const { data } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setVideos(data);
    }
    setIsLoading(false);
  };

  const uniqueSubjects = [...new Set(videos.map((v) => v.subject))];
  const uniqueClasses = [...new Set(videos.map((v) => v.class))];

  const filteredVideos = videos.filter((video) => {
    if (filter.subject && video.subject !== filter.subject) return false;
    if (filter.class && video.class !== filter.class) return false;
    return true;
  });

  const getEmbedUrl = (url: string) => {
    // Convert YouTube watch URL to embed URL
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    return url;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading videos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Videos</h1>
        <p className="text-muted-foreground">Watch video lectures and tutorials</p>
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

      {/* Active Video Player */}
      {activeVideo && (
        <div className="dashboard-card">
          <div className="aspect-video rounded-xl overflow-hidden bg-black mb-4">
            <iframe
              src={getEmbedUrl(activeVideo.video_url)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">{activeVideo.title}</h3>
              <p className="text-sm text-muted-foreground">
                {activeVideo.subject} • {activeVideo.class}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveVideo(null)}>
              Close
            </Button>
          </div>
        </div>
      )}

      {filteredVideos.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <Play className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Videos Available</h3>
          <p className="text-muted-foreground">Check back later for video lectures.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="dashboard-card group cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveVideo(video)}
            >
              <div className="aspect-video rounded-xl overflow-hidden bg-secondary mb-4 relative">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-8 h-8 text-primary ml-1" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                  {video.subject}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                  {video.class}
                </span>
              </div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {video.title}
              </h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
