import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploaderProps {
  bucket: string;
  accept?: string;
  maxSizeMB?: number;
  onUploadComplete: (url: string, fileName: string) => void;
  existingUrl?: string;
}

// Scale timeout based on file size: 30s base + 5s per MB
function getTimeout(fileSizeMB: number) {
  return Math.max(30000, 30000 + fileSizeMB * 5000);
}

const MAX_RETRIES = 2;

export function FileUploader({
  bucket,
  accept = '.pdf',
  maxSizeMB = 50,
  onUploadComplete,
  existingUrl,
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState(existingUrl || '');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const sizeMB = file.size / 1024 / 1024;
    console.log('[FileUploader] Selected:', file.name, file.type, `${sizeMB.toFixed(2)}MB`);

    if (accept === '.pdf' && file.type !== 'application/pdf') {
      setError('Please select a PDF file.');
      return;
    }

    if (sizeMB > maxSizeMB) {
      setError(`File too large (${sizeMB.toFixed(1)}MB). Max ${maxSizeMB}MB.`);
      return;
    }

    setSelectedFile(file);
    setUploadedUrl('');
  }, [accept, maxSizeMB]);

  const uploadFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setProgress(0);
    setError(null);

    // Verify session
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setError('Not logged in. Please refresh and log in again.');
      setIsUploading(false);
      return;
    }

    const sizeMB = selectedFile.size / 1024 / 1024;
    const timeout = getTimeout(sizeMB);
    const timestamp = Date.now();
    const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${timestamp}-${safeName}`;

    console.log(`[FileUploader] Uploading ${sizeMB.toFixed(1)}MB, timeout: ${timeout}ms`);

    // Simulate progress based on file size
    const progressStep = Math.max(2, Math.min(8, 80 / (sizeMB * 2)));
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + progressStep, 90));
    }, 500);

    let lastError: string | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[FileUploader] Retry ${attempt}/${MAX_RETRIES}`);
          await new Promise(r => setTimeout(r, 1500 * attempt));
        }

        abortRef.current = new AbortController();
        const timer = setTimeout(() => abortRef.current?.abort(), timeout);

        const { data, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: true, // allow retry without "already exists" error
          });

        clearTimeout(timer);

        if (uploadError) {
          lastError = uploadError.message;
          console.error(`[FileUploader] Attempt ${attempt + 1} error:`, lastError);
          if (attempt < MAX_RETRIES) continue;
          break;
        }

        // Success
        clearInterval(progressInterval);
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
        console.log('[FileUploader] Success:', urlData.publicUrl);

        setProgress(100);
        setUploadedUrl(urlData.publicUrl);
        onUploadComplete(urlData.publicUrl, selectedFile.name);
        setIsUploading(false);
        toast({ title: '✅ Upload Complete', description: `${selectedFile.name} uploaded.` });
        return;
      } catch (err: any) {
        lastError = err.name === 'AbortError' ? 'Upload timed out. Try a smaller file or better connection.' : (err.message || 'Unknown error');
        console.error(`[FileUploader] Attempt ${attempt + 1} exception:`, lastError);
        if (attempt < MAX_RETRIES) continue;
      }
    }

    clearInterval(progressInterval);

    // Map error to user-friendly message
    let userMsg = lastError || 'Upload failed.';
    if (lastError?.includes('exceeded') || lastError?.includes('limit')) {
      userMsg = `File too large. Maximum is ${maxSizeMB}MB.`;
    } else if (lastError?.includes('Bucket') || lastError?.includes('not found')) {
      userMsg = 'Storage not configured. Contact admin.';
    } else if (lastError?.includes('policy') || lastError?.includes('denied')) {
      userMsg = 'Permission denied. Make sure you are logged in as admin.';
    } else if (lastError?.includes('timeout') || lastError?.includes('abort') || lastError?.includes('fetch') || lastError?.includes('network')) {
      userMsg = 'Network timeout. Check your connection and try again.';
    }

    setError(userMsg);
    toast({ title: 'Upload Failed', description: userMsg, variant: 'destructive' });
    setIsUploading(false);
  };

  const clearFile = () => {
    abortRef.current?.abort();
    setSelectedFile(null);
    setUploadedUrl('');
    setProgress(0);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {!selectedFile && !uploadedUrl && (
        <div
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors active:scale-[0.98]"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">Tap to upload</p>
          <p className="text-sm text-muted-foreground">
            PDF files up to {maxSizeMB}MB
          </p>
        </div>
      )}

      {selectedFile && !uploadedUrl && (
        <div className="border rounded-xl p-4 bg-muted/50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <File className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={clearFile} disabled={isUploading}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {isUploading && (
            <div className="mt-4 space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Uploading... {Math.round(progress)}%
              </p>
            </div>
          )}

          {!isUploading && (
            <Button className="w-full mt-4" onClick={uploadFile}>
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          )}
        </div>
      )}

      {uploadedUrl && (
        <div className="border rounded-xl p-4 bg-green-500/5 border-green-500/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">File Uploaded ✅</p>
              <p className="text-sm text-muted-foreground truncate">
                {selectedFile?.name || 'Existing file'}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFile}>
              Replace
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/5 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
