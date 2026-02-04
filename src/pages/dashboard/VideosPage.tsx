import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { CardSkeletonGrid } from '@/components/skeletons/CardSkeleton';
import { SearchInput } from '@/components/SearchInput';

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
  const navigate = useNavigate();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    // RLS automatically filters by student's class
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

  const filteredVideos = videos.filter((video) => {
    if (filterSubject && video.subject !== filterSubject) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        video.title.toLowerCase().includes(query) ||
        video.subject.toLowerCase().includes(query)
      );
    }
    return true;
  });

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

      {/* Search and Filters */}
      {videos.length > 0 && (
        <div className="space-y-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search videos by title..."
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

      {/* Video Player Modal - Removed, using dedicated page now */}

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
                onClick={() => navigate(`/dashboard/videos/${video.id}`)}
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
