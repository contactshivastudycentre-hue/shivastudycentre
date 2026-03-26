import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  mapUploadErrorToMessage,
  MULTIPART_THRESHOLD_BYTES,
  uploadPdfToNotesStorage,
} from '@/lib/notesUpload';

interface FileUploaderProps {
  bucket: string;
  accept?: string;
  maxSizeMB?: number;
  onUploadComplete: (url: string, fileName: string) => void;
  existingUrl?: string;
}

export function FileUploader({
  bucket,
  accept = '.pdf',
  maxSizeMB = 10,
  onUploadComplete,
  existingUrl,
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState(existingUrl || '');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    setUploadedUrl(existingUrl || '');
  }, [existingUrl]);

  // Prevent navigation/reload during upload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (uploadingRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Prevent mobile visibility change from killing upload
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && selectedFile && !uploadingRef.current && !uploadedUrl) {
        console.log('[FileUploader] Tab refocused — file still selected:', selectedFile.name);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [selectedFile, uploadedUrl]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const sizeMB = file.size / 1024 / 1024;
    console.log('[FileUploader] Selected:', file.name, file.type, `${sizeMB.toFixed(2)}MB`);

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (accept === '.pdf' && !isPdf) {
      setError('Invalid file type. Please upload a PDF only.');
      return;
    }

    if (sizeMB > maxSizeMB) {
      setError(`PDF is too large. Please upload a file under ${maxSizeMB}MB.`);
      return;
    }

    // Store file in state immediately — survives mobile tab switches
    setSelectedFile(file);
    setUploadedUrl('');
  }, [accept, maxSizeMB]);

  const uploadFile = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    uploadingRef.current = true;
    setProgress(0);
    setError(null);

    const sizeMB = selectedFile.size / 1024 / 1024;
    const isLargeFile = selectedFile.size > MULTIPART_THRESHOLD_BYTES;
    console.log(`[FileUploader] Upload start: ${selectedFile.name} (${sizeMB.toFixed(2)}MB)`);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError('Not logged in. Please refresh and log in again.');
        return;
      }

      const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
      if (adminError || !isAdmin) {
        const adminMsg = 'Upload blocked. Only admin accounts can upload notes.';
        console.error('[FileUploader] Admin check failed:', adminError || 'not admin');
        setError(adminMsg);
        toast({ title: 'Upload Failed', description: adminMsg, variant: 'destructive' });
        return;
      }

      // Fake progress for small files (no real progress from SDK)
      const fallbackProgress = !isLargeFile
        ? window.setInterval(() => {
            setProgress((prev) => Math.min(prev + 5, 85));
          }, 350)
        : null;

      const result = await uploadPdfToNotesStorage({
        bucket,
        file: selectedFile,
        onProgress: (value) => {
          setProgress(value);
        },
      });

      if (fallbackProgress) window.clearInterval(fallbackProgress);

      console.log('[FileUploader] Upload success:', {
        filePath: result.filePath,
        publicUrl: result.publicUrl,
        multipart: result.usedMultipart,
      });

      setProgress(100);
      setUploadedUrl(result.publicUrl);
      onUploadComplete(result.publicUrl, selectedFile.name);
      toast({ title: '✅ Upload Complete', description: 'PDF uploaded successfully.' });
    } catch (uploadError) {
      console.error('[FileUploader] Upload failure:', uploadError);
      const message = mapUploadErrorToMessage(uploadError, maxSizeMB);
      setError(message);
      toast({ title: 'Upload Failed', description: message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      uploadingRef.current = false;
    }
  };

  const clearFile = () => {
    if (isUploading) return;
    setSelectedFile(null);
    setUploadedUrl('');
    setProgress(0);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-3 w-full">
      {/* Select state */}
      {!selectedFile && !uploadedUrl && (
        <div className="border-2 border-dashed border-border rounded-xl p-4 sm:p-6 text-center space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            capture={undefined}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground mx-auto" />
          <Button
            type="button"
            variant="outline"
            className="w-full min-h-[48px] text-base"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Select PDF
          </Button>
          <p className="text-xs sm:text-sm text-muted-foreground">
            PDF only • Max {maxSizeMB}MB
          </p>
        </div>
      )}

      {/* File selected, ready to upload */}
      {selectedFile && !uploadedUrl && (
        <div className="border rounded-xl p-3 sm:p-4 bg-muted/50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <File className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm sm:text-base truncate">{selectedFile.name}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={clearFile} disabled={isUploading}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {isUploading && (
            <div className="mt-3 space-y-2">
              <Progress value={progress} className="h-2.5" />
              <p className="text-xs text-muted-foreground text-center">
                Uploading… {Math.round(progress)}%
              </p>
            </div>
          )}

          <Button
            className="w-full mt-3 min-h-[48px] text-base"
            onClick={uploadFile}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF
              </>
            )}
          </Button>
        </div>
      )}

      {/* Success state */}
      {uploadedUrl && (
        <div className="border rounded-xl p-3 sm:p-4 bg-green-500/5 border-green-500/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">File Uploaded ✅</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {selectedFile?.name || 'Existing file'}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="flex-shrink-0" onClick={clearFile}>
              Replace
            </Button>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 text-destructive text-xs sm:text-sm bg-destructive/5 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
