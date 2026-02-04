import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Maximize2, Minimize2, ArrowLeft } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  title: string;
  subject: string;
  className?: string;
  onClose: () => void;
}

export function VideoPlayer({ url, title, subject, className, onClose }: VideoPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert YouTube URL to embed URL with proper parameters
  const getEmbedUrl = (originalUrl: string) => {
    // YouTube watch URL
    const youtubeMatch = originalUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      // rel=0: no related videos, modestbranding=1: minimal branding
      // controls=1: show controls, playsinline=1: play inline on mobile
      // fs=1: allow fullscreen, iv_load_policy=3: hide annotations
      // disablekb=0: enable keyboard controls
      return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&playsinline=1&fs=1&iv_load_policy=3&autoplay=1&enablejsapi=1`;
    }
    
    // YouTube embed URL (already embedded)
    if (originalUrl.includes('youtube.com/embed/') || originalUrl.includes('youtube-nocookie.com/embed/')) {
      const hasParams = originalUrl.includes('?');
      return `${originalUrl}${hasParams ? '&' : '?'}rel=0&modestbranding=1&autoplay=1`;
    }

    // Google Drive video
    const driveMatch = originalUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }

    return originalUrl;
  };

  const handleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  // Listen for fullscreen changes (ESC key, etc.)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle ESC key to close when not in fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-background/98 backdrop-blur-sm animate-fade-in"
      ref={containerRef}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0"
              title="Back to videos"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{title}</h3>
              <p className="text-sm text-muted-foreground">
                {subject} • {className}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              title="Close"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Video Container */}
        <div className="flex-1 bg-black flex items-center justify-center overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-white/70">Loading video...</p>
              </div>
            </div>
          )}
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full max-w-[1600px] aspect-video">
              <iframe
                src={getEmbedUrl(url)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                title={title}
                onLoad={() => setIsLoading(false)}
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
