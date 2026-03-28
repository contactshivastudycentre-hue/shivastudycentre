import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadPdfToNotesStorage, mapUploadErrorToMessage } from '@/lib/notesUpload';

interface FileUploaderProps {
  bucket: string;
  accept?: string;
  maxSizeMB?: number;
  onUploadComplete: (url: string, fileName: string) => void;
  existingUrl?: string;
}

export interface FileUploaderHandle {
  reset: () => void;
}

const sanitizeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.{2,}/g, '.').replace(/_+/g, '_');

export const FileUploader = forwardRef<FileUploaderHandle, FileUploaderProps>(
  function FileUploader({ bucket, accept = '.pdf', maxSizeMB = 10, onUploadComplete, existingUrl }, ref) {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
    const [uploadedUrl, setUploadedUrl] = useState(existingUrl || '');
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // ─── Mobile resilience: persist file across page suspensions ───
    // On mobile, opening the native file picker can suspend the page.
    // When the page resumes, React may re-render and lose state.
    // We store the selected file in a ref so it survives re-renders.
    const fileRef = useRef<globalThis.File | null>(null);

    // Sync ref whenever state changes
    useEffect(() => {
      fileRef.current = selectedFile;
    }, [selectedFile]);

    // Restore file from ref after visibility change (mobile resume)
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && fileRef.current && !selectedFile) {
          setSelectedFile(fileRef.current);
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [selectedFile]);

    useEffect(() => {
      setUploadedUrl(existingUrl || '');
    }, [existingUrl]);

    // Prevent navigation during upload
    useEffect(() => {
      const handler = (e: BeforeUnloadEvent) => {
        if (isUploading) { e.preventDefault(); e.returnValue = ''; }
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }, [isUploading]);

    const clearFile = useCallback(() => {
      if (isUploading) return;
      setSelectedFile(null);
      fileRef.current = null;
      setUploadedUrl('');
      setProgress(0);
      setError(null);
      if (inputRef.current) inputRef.current.value = '';
    }, [isUploading]);

    useImperativeHandle(ref, () => ({ reset: clearFile }), [clearFile]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError(null);

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (accept === '.pdf' && !isPdf) {
        setError('Invalid file type. Please upload a PDF only.');
        return;
      }
      if (file.size / 1024 / 1024 > maxSizeMB) {
        setError(`PDF is too large. Please upload a file under ${maxSizeMB}MB.`);
        return;
      }

      // Store in both state and ref for mobile resilience
      fileRef.current = file;
      setSelectedFile(file);
      setUploadedUrl('');
    }, [accept, maxSizeMB]);

    const uploadFile = async () => {
      // Use ref as fallback if state was lost
      const fileToUpload = selectedFile || fileRef.current;
      if (!fileToUpload || isUploading) return;

      // Restore state if it was lost
      if (!selectedFile && fileRef.current) {
        setSelectedFile(fileRef.current);
      }

      setIsUploading(true);
      setProgress(0);
      setError(null);

      console.log('[FileUploader] Upload start:', fileToUpload.name);

      try {
        const result = await uploadPdfToNotesStorage({
          bucket,
          file: fileToUpload,
          onProgress: (p) => setProgress(p),
        });

        setProgress(100);
        setUploadedUrl(result.publicUrl);
        onUploadComplete(result.publicUrl, fileToUpload.name);
        toast({ title: '✅ Upload Complete', description: 'PDF uploaded successfully.' });
        console.log('[FileUploader] Success:', result.publicUrl);
      } catch (err: any) {
        const msg = mapUploadErrorToMessage(err, maxSizeMB);
        console.error('[FileUploader] Failed:', err);
        setError(msg);
        toast({ title: 'Upload Failed', description: msg, variant: 'destructive' });
      } finally {
        setIsUploading(false);
      }
    };

    return (
      <div className="space-y-3 w-full">
        {/* Select state */}
        {!selectedFile && !fileRef.current && !uploadedUrl && (
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center space-y-3">
            <input ref={inputRef} type="file" accept={accept} onChange={handleFileSelect} className="hidden" />
            <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
            <Button type="button" variant="outline" className="w-full min-h-[48px] text-base" onClick={() => inputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> Select PDF
            </Button>
            <p className="text-xs text-muted-foreground">PDF only • Max {maxSizeMB}MB</p>
          </div>
        )}

        {/* File selected */}
        {(selectedFile || fileRef.current) && !uploadedUrl && (
          <div className="border rounded-xl p-4 bg-muted/50 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <File className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{(selectedFile || fileRef.current)!.name}</p>
                <p className="text-xs text-muted-foreground">{((selectedFile || fileRef.current)!.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={clearFile} disabled={isUploading}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {isUploading && (
              <div className="space-y-1">
                <Progress value={progress} className="h-2.5" />
                <p className="text-xs text-muted-foreground text-center">Uploading… {Math.round(progress)}%</p>
              </div>
            )}

            <Button type="button" className="w-full min-h-[48px] text-base" onClick={uploadFile} disabled={isUploading}>
              {isUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4 mr-2" /> Upload PDF</>}
            </Button>
          </div>
        )}

        {/* Success */}
        {uploadedUrl && (
          <div className="border rounded-xl p-4 bg-green-500/5 border-green-500/20">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">File Uploaded ✅</p>
                <p className="text-xs text-muted-foreground truncate">{(selectedFile || fileRef.current)?.name || 'Existing file'}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={clearFile}>Replace</Button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/5 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);
