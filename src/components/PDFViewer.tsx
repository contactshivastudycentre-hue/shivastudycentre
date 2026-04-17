import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Maximize2, Minimize2, Loader2, AlertCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PDFViewerProps {
  storagePath: string;
  title: string;
  subject?: string;
  className?: string;
  onClose: () => void;
}

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

export function PDFViewer({ storagePath, title, subject, className, onClose }: PDFViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderingRef = useRef<Set<number>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    loadPDF();
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      pdfDocRef.current?.destroy();
      observerRef.current?.disconnect();
    };
  }, [storagePath]);

  useEffect(() => {
    if (!pdfDocRef.current) return;
    renderingRef.current.clear();
    canvasRefs.current.forEach((_, pageNum) => {
      renderPage(pageNum);
    });
  }, [zoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || totalPages === 0) return;

    const handleScroll = () => {
      const children = container.querySelectorAll('[data-page]');
      let closest = 1;
      let minDist = Infinity;
      const containerTop = container.scrollTop + container.clientHeight / 3;

      children.forEach((child) => {
        const el = child as HTMLElement;
        const dist = Math.abs(el.offsetTop - containerTop);
        if (dist < minDist) {
          minDist = dist;
          closest = parseInt(el.dataset.page || '1');
        }
      });
      setCurrentPage(closest);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [totalPages]);

  const extractFilePath = (path: string) => {
    let filePath = path;
    if (path.includes('storage/v1/object/public/notes/')) {
      filePath = path.split('storage/v1/object/public/notes/')[1];
    } else if (path.includes('storage/v1/object/sign/notes/')) {
      filePath = path.split('storage/v1/object/sign/notes/')[1].split('?')[0];
    }
    return decodeURIComponent(filePath);
  };

  const loadPDF = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const filePath = extractFilePath(storagePath);
      const { data, error: downloadError } = await supabase.storage.from('notes').download(filePath);
      if (downloadError || !data) throw new Error('Failed to load PDF.');

      const url = URL.createObjectURL(data);
      setBlobUrl(url);

      const arrayBuffer = await data.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
    } catch (err) {
      console.error('Error loading PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPage = useCallback(async (pageNum: number) => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRefs.current.get(pageNum);
    if (!pdf || !canvas || renderingRef.current.has(pageNum)) return;

    renderingRef.current.add(pageNum);

    try {
      const page = await pdf.getPage(pageNum);
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth - 16;
      const viewport = page.getViewport({ scale: 1 });
      const baseScale = containerWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale: baseScale * zoom });

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = scaledViewport.width * dpr;
      canvas.height = scaledViewport.height * dpr;
      canvas.style.width = `${scaledViewport.width}px`;
      canvas.style.height = `${scaledViewport.height}px`;
      ctx.scale(dpr, dpr);

      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
    } catch (err) {
      console.error(`Error rendering page ${pageNum}:`, err);
    } finally {
      renderingRef.current.delete(pageNum);
    }
  }, [zoom]);

  const setCanvasRef = useCallback((pageNum: number, el: HTMLCanvasElement | null) => {
    if (el) {
      canvasRefs.current.set(pageNum, el);
      if (!observerRef.current) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const page = parseInt((entry.target as HTMLElement).dataset.page || '0');
                if (page > 0) renderPage(page);
              }
            });
          },
          { root: containerRef.current, rootMargin: '200px' }
        );
      }
      const wrapper = el.closest('[data-page]');
      if (wrapper) observerRef.current.observe(wrapper);
      if (pageNum <= 2) renderPage(pageNum);
    } else {
      canvasRefs.current.delete(pageNum);
    }
  }, [renderPage]);

  const handleDownload = async () => {
    try {
      const filePath = extractFilePath(storagePath);
      const { data, error } = await supabase.storage.from('notes').download(filePath);
      if (error || !data) throw new Error('Failed to download');

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

  const zoomIn = () => setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  const zoomOut = () => setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  const resetZoom = () => setZoom(1);

  return (
    <div className="fixed inset-0 z-[9999] bg-background animate-fade-in flex flex-col">
      <div className={`bg-card shadow-2xl border overflow-hidden flex flex-col h-full ${isFullscreen ? 'rounded-none' : 'md:rounded-xl md:max-w-6xl md:mx-auto md:my-4 md:h-[calc(100vh-2rem)]'}`}>
        {/* Header — solid bg covers safe-area, prominent back button */}
        <div
          className="flex items-center justify-between gap-2 px-3 border-b bg-card shrink-0"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)', paddingBottom: '0.5rem' }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button
              variant="ghost"
              onClick={onClose}
              className="shrink-0 h-11 px-3 gap-2 text-primary font-semibold hover:bg-primary/10"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-base">Back</span>
            </Button>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground text-sm truncate">{title}</h3>
              {(subject || className) && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  {subject && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">{subject}</span>}
                  {className && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">{className}</span>}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" onClick={handleDownload} disabled={isLoading || !!error} className="h-10 w-10">
              <Download className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)} className="hidden md:flex h-10 w-10">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Zoom controls + page indicator */}
        {totalPages > 0 && !error && (
          <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30 shrink-0">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={zoomOut} disabled={zoom <= MIN_ZOOM} className="h-7 w-7">
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={resetZoom} className="h-7 px-2 text-xs font-mono">
                {Math.round(zoom * 100)}%
              </Button>
              <Button variant="ghost" size="icon" onClick={zoomIn} disabled={zoom >= MAX_ZOOM} className="h-7 w-7">
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Page {currentPage} / {totalPages}
            </span>
          </div>
        )}

        {/* PDF Content */}
        <div ref={containerRef} className="flex-1 relative overflow-y-auto overflow-x-hidden" style={{ touchAction: 'pan-y pinch-zoom', WebkitOverflowScrolling: 'touch', background: 'hsl(224 71% 6%)' }}>
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
                  <Button variant="outline" onClick={onClose}>Go Back</Button>
                  <Button onClick={loadPDF}>Try Again</Button>
                </div>
              </div>
            </div>
          )}

          {!error && totalPages > 0 && (
            <div className="flex flex-col items-center gap-2 p-1 sm:p-2 pb-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <div key={pageNum} data-page={pageNum} className="w-full flex justify-center overflow-hidden">
                  <canvas
                    ref={(el) => setCanvasRef(pageNum, el)}
                    className="shadow-md bg-white max-w-full"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
