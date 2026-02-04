import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Play, X } from 'lucide-react';
import { CardSkeletonGrid } from '@/components/skeletons/CardSkeleton';

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

  // Convert YouTube URL to embed URL with proper parameters
  const getEmbedUrl = (url: string) => {
    // YouTube watch URL
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      // rel=0: no related videos, modestbranding=1: minimal YouTube branding
      // controls=1: show controls, playsinline=1: play inline on mobile
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&playsinline=1`;
    }
    
    // YouTube embed URL (already embedded)
    if (url.includes('youtube.com/embed/')) {
      // Ensure proper params are added
      const hasParams = url.includes('?');
      return `${url}${hasParams ? '&' : '?'}rel=0&modestbranding=1`;
    }

    // Google Drive video
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }

    return url;
  };

  // Get YouTube thumbnail
  const getThumbnail = (video: Video) => {
    if (video.thumbnail_url) return video.thumbnail_url;

    const youtubeMatch = video.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?]+)/);
    if (youtubeMatch) {
      return `https://img.youtube.com/vi/${youtubeMatch[1]}/mqdefault.jpg`;
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Videos</h1>
          <p className="text-muted-foreground">Watch video lectures and tutorials</p>
        </div>
        <CardSkeletonGrid count={6} variant="video" />
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
      {videos.length > 0 && (
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
      )}

      {/* Active Video Player Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in p-4 md:p-8">
          <div className="bg-card rounded-xl shadow-2xl border overflow-hidden h-full max-w-5xl mx-auto flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
              <div className="flex-1 mr-4">
                <h3 className="font-semibold text-foreground truncate">{activeVideo.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {activeVideo.subject} • {activeVideo.class}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setActiveVideo(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Video Container */}
            <div className="flex-1 bg-black flex items-center justify-center">
              <div className="w-full h-full max-h-[70vh] aspect-video">
                <iframe
                  src={getEmbedUrl(activeVideo.video_url)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={activeVideo.title}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredVideos.length === 0 ? (
        <div className="dashboard-card text-center py-12">
          <Play className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Videos Available</h3>
          <p className="text-muted-foreground">
            {videos.length === 0
              ? 'Video lectures will appear here once uploaded by admin.'
              : 'No videos match your current filters.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video) => {
            const thumbnail = getThumbnail(video);
            return (
              <div
                key={video.id}
                className="dashboard-card group cursor-pointer hover:shadow-md transition-all duration-200"
                onClick={() => setActiveVideo(video)}
              >
                <div className="aspect-video rounded-xl overflow-hidden bg-secondary mb-4 relative">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                      <Play className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
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
            );
          })}
        </div>
      )}
    </div>
  );
}
