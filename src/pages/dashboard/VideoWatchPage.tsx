import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  ThumbsUp, 
  MessageCircle, 
  Share2, 
  Play,
  Send,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { CardSkeletonGrid } from '@/components/skeletons/CardSkeleton';

interface Video {
  id: string;
  title: string;
  subject: string;
  class: string;
  video_url: string;
  thumbnail_url: string | null;
  description: string | null;
  comments_enabled: boolean;
  created_at: string;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export default function VideoWatchPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Fetch video details
  useEffect(() => {
    if (videoId) {
      fetchVideo();
    }
  }, [videoId]);

  const fetchVideo = async () => {
    setIsLoading(true);
    
    const { data: videoData, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .maybeSingle();

    if (error || !videoData) {
      toast({
        title: 'Video not found',
        description: 'The video you are looking for does not exist.',
        variant: 'destructive',
      });
      navigate('/dashboard/videos');
      return;
    }

    setVideo(videoData);
    
    // Fetch related videos (same class and subject)
    const { data: related } = await supabase
      .from('videos')
      .select('*')
      .eq('class', videoData.class)
      .eq('subject', videoData.subject)
      .neq('id', videoId)
      .limit(6);

    if (related) {
      setRelatedVideos(related);
    }

    // Fetch like count
    const { data: likes } = await supabase
      .from('video_likes')
      .select('id')
      .eq('video_id', videoId);
    
    setLikeCount(likes?.length || 0);

    // Check if user has liked
    if (user) {
      const { data: userLike } = await supabase
        .from('video_likes')
        .select('id')
        .eq('video_id', videoId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      setHasLiked(!!userLike);
    }

    // Fetch comments
    fetchComments();
    
    setIsLoading(false);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('video_comments')
      .select(`
        id,
        user_id,
        content,
        created_at
      `)
      .eq('video_id', videoId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (data) {
      // Fetch profiles separately
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const commentsWithProfiles = data.map(comment => ({
        ...comment,
        profiles: profileMap.get(comment.user_id)
      }));

      setComments(commentsWithProfiles);
    }
  };

  const handleLike = async () => {
    if (!user || isLiking) return;
    
    setIsLiking(true);
    
    if (hasLiked) {
      // Unlike
      await supabase
        .from('video_likes')
        .delete()
        .eq('video_id', videoId)
        .eq('user_id', user.id);
      
      setLikeCount(prev => prev - 1);
      setHasLiked(false);
    } else {
      // Like
      const { error } = await supabase
        .from('video_likes')
        .insert({ video_id: videoId, user_id: user.id });
      
      if (!error) {
        setLikeCount(prev => prev + 1);
        setHasLiked(true);
      }
    }
    
    setIsLiking(false);
  };

  const handleComment = async () => {
    if (!user || !newComment.trim() || isCommenting) return;
    
    setIsCommenting(true);
    
    const { error } = await supabase
      .from('video_comments')
      .insert({
        video_id: videoId,
        user_id: user.id,
        content: newComment.trim()
      });
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to post comment.',
        variant: 'destructive',
      });
    } else {
      setNewComment('');
      fetchComments();
      toast({
        title: 'Comment posted',
        description: 'Your comment has been added.',
      });
    }
    
    setIsCommenting(false);
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: video?.title,
          text: `Watch "${video?.title}" on Shiva Study Center`,
          url: url,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link copied',
        description: 'Video link copied to clipboard.',
      });
    }
  };

  // Convert YouTube URL to embed URL
  const getEmbedUrl = useCallback((originalUrl: string) => {
    const youtubeMatch = originalUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&playsinline=1&fs=1&iv_load_policy=3&enablejsapi=1`;
    }
    
    if (originalUrl.includes('youtube.com/embed/') || originalUrl.includes('youtube-nocookie.com/embed/')) {
      const hasParams = originalUrl.includes('?');
      return `${originalUrl}${hasParams ? '&' : '?'}rel=0&modestbranding=1`;
    }

    const driveMatch = originalUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }

    return originalUrl;
  }, []);

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
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="animate-pulse">
            <div className="h-8 w-32 bg-muted rounded mb-4" />
            <div className="aspect-video bg-muted rounded-xl mb-6" />
            <div className="h-8 w-3/4 bg-muted rounded mb-2" />
            <div className="h-4 w-1/2 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Video Player Section */}
        <div className="bg-black">
          {/* Back Button - Mobile */}
          <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-black/90">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/videos')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="text-white/80 text-sm truncate">{video.title}</span>
          </div>

          {/* Video Player */}
          <div className="aspect-video w-full">
            <iframe
              src={getEmbedUrl(video.video_url)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              title={video.title}
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="px-4 py-6 lg:flex lg:gap-8">
          {/* Main Content */}
          <div className="flex-1">
            {/* Back Button - Desktop */}
            <div className="hidden md:block mb-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard/videos')}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Videos
              </Button>
            </div>

            {/* Video Info */}
            <div className="mb-6">
              <h1 className="text-xl md:text-2xl font-display font-bold text-foreground mb-3">
                {video.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
                  {video.subject}
                </span>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-secondary text-secondary-foreground">
                  {video.class}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(video.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>

              {video.description && (
                <p className="text-muted-foreground text-sm mb-4">
                  {video.description}
                </p>
              )}

              {/* Branding */}
              <p className="text-xs text-muted-foreground/60">
                Powered by <span className="font-medium">LEADPE</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mb-6 pb-6 border-b">
              <Button
                variant={hasLiked ? 'default' : 'outline'}
                size="sm"
                onClick={handleLike}
                disabled={isLiking}
                className="gap-2"
              >
                <ThumbsUp className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
                {likeCount > 0 ? likeCount : 'Like'}
              </Button>
              
              {video.comments_enabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  className="gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  {comments.length > 0 ? comments.length : 'Comment'}
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>

            {/* Comments Section */}
            {showComments && video.comments_enabled && (
              <div className="space-y-4 mb-8">
                <h3 className="font-semibold text-foreground">
                  Comments ({comments.length})
                </h3>

                {/* New Comment Form */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="min-h-[80px] resize-none"
                      maxLength={500}
                    />
                  </div>
                  <Button
                    onClick={handleComment}
                    disabled={!newComment.trim() || isCommenting}
                    size="icon"
                    className="self-end"
                  >
                    {isCommenting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No comments yet. Be the first to comment!
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-primary">
                            {comment.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">
                              {comment.profiles?.full_name || 'Student'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/80">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Related Videos - Sidebar on Desktop, Below on Mobile */}
          {relatedVideos.length > 0 && (
            <div className="lg:w-80 xl:w-96 mt-8 lg:mt-0">
              <h3 className="font-semibold text-foreground mb-4">Related Videos</h3>
              <div className="space-y-3">
                {relatedVideos.map((relatedVideo) => {
                  const thumbnail = getThumbnail(relatedVideo);
                  return (
                    <Link
                      key={relatedVideo.id}
                      to={`/dashboard/videos/${relatedVideo.id}`}
                      className="flex gap-3 group p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-32 sm:w-40 lg:w-32 xl:w-40 flex-shrink-0 aspect-video rounded-lg overflow-hidden bg-muted relative">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={relatedVideo.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1">
                          {relatedVideo.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {relatedVideo.subject}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
