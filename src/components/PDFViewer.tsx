import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Maximize2, Minimize2, ExternalLink } from 'lucide-react';

interface PDFViewerProps {
  url: string;
  title: string;
  onClose: () => void;
}

export function PDFViewer({ url, title, onClose }: PDFViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Convert Google Drive links to embeddable format
  const getEmbedUrl = (originalUrl: string) => {
    // Google Drive file link
    const driveMatch = originalUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
    
    // Google Drive open link
    const driveOpenMatch = originalUrl.match(/drive\.google\.com\/open\?id=([^&]+)/);
    if (driveOpenMatch) {
      return `https://drive.google.com/file/d/${driveOpenMatch[1]}/preview`;
    }
    
    // Already an embeddable link or direct PDF
    return originalUrl;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = title;
    link.target = '_blank';
    link.click();
  };

  const handleOpenExternal = () => {
    window.open(url, '_blank');
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in ${
        isFullscreen ? '' : 'p-4 md:p-8'
      }`}
    >
      <div
        className={`bg-card rounded-xl shadow-2xl border overflow-hidden flex flex-col ${
          isFullscreen ? 'h-full rounded-none' : 'h-full max-w-6xl mx-auto'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
          <h3 className="font-semibold text-foreground truncate flex-1 mr-4">
            {title}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenExternal}
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 relative bg-muted">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          )}
          <iframe
            src={getEmbedUrl(url)}
            className="w-full h-full"
            onLoad={() => setIsLoading(false)}
            title={title}
            allow="autoplay"
          />
        </div>
      </div>
    </div>
  );
}
