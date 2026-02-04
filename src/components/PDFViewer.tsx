import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Maximize2, Minimize2, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PDFViewerProps {
  /** The storage path (e.g., 'notes/filename.pdf') or full URL */
  storagePath: string;
  title: string;
  subject?: string;
  className?: string;
  onClose: () => void;
}

export function PDFViewer({ storagePath, title, subject, className, onClose }: PDFViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    loadPDF();
    
    // Cleanup blob URL on unmount
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [storagePath]);

  const loadPDF = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Extract the file path from the URL if it's a full Supabase URL
      let filePath = storagePath;
      
      // If it's a full Supabase storage URL, extract the path
      if (storagePath.includes('storage/v1/object/public/notes/')) {
        filePath = storagePath.split('storage/v1/object/public/notes/')[1];
      } else if (storagePath.includes('storage/v1/object/sign/notes/')) {
        filePath = storagePath.split('storage/v1/object/sign/notes/')[1].split('?')[0];
      }

      // Decode the file path in case it's URL encoded
      filePath = decodeURIComponent(filePath);

      // Download the file from Supabase Storage
      const { data, error: downloadError } = await supabase.storage
        .from('notes')
        .download(filePath);

      if (downloadError) {
        console.error('Download error:', downloadError);
        throw new Error('Failed to load PDF. Please try again.');
      }

      if (!data) {
        throw new Error('No data received from storage.');
      }

      // Create a blob URL from the downloaded data
      const url = URL.createObjectURL(data);
      setBlobUrl(url);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      // Extract the file path
      let filePath = storagePath;
      if (storagePath.includes('storage/v1/object/public/notes/')) {
        filePath = storagePath.split('storage/v1/object/public/notes/')[1];
      }
      filePath = decodeURIComponent(filePath);

      // Download the file
      const { data, error } = await supabase.storage
        .from('notes')
        .download(filePath);

      if (error || !data) {
        throw new Error('Failed to download file');
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-background animate-fade-in ${
        isFullscreen ? '' : 'p-0 md:p-4'
      }`}
    >
      <div
        className={`bg-card shadow-2xl border overflow-hidden flex flex-col h-full ${
          isFullscreen ? 'rounded-none' : 'md:rounded-xl md:max-w-6xl md:mx-auto'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground truncate">
                {title}
              </h3>
              {(subject || className) && (
                <div className="flex items-center gap-2 mt-0.5">
                  {subject && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                      {subject}
                    </span>
                  )}
                  {className && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                      {className}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              title="Download PDF"
              disabled={isLoading || !!error}
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              className="hidden md:flex"
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
              className="hidden md:flex"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Powered by KAIRAUX */}
        <div className="text-center py-1 border-b bg-muted/30 shrink-0">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Powered by KAIRAUX
          </span>
        </div>

        {/* PDF Content */}
        <div className="flex-1 relative bg-muted overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="flex flex-col items-center gap-4 text-center p-6 max-w-md">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Failed to Load PDF</h3>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={onClose}>
                    Go Back
                  </Button>
                  <Button onClick={loadPDF}>
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}

          {blobUrl && !error && (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title={title}
              style={{ minHeight: '100%' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
