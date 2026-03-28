import { useCallback, useEffect, useRef, useState } from 'react';
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

export function FileUploader({
  bucket,
  accept = '.pdf',
  maxSizeMB = 10,
  onUploadComplete,
  existingUrl,
}: FileUploaderProps) {
  const [status, setStatus] = useState<'idle' | 'selected' | 'uploading' | 'done' | 'error'>( existingUrl ? 'done' : 'idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);

  // The file is stored ONLY in a ref — never in React state.
  // This prevents mobile browsers from losing the file when the
  // page is suspended/resumed by the native file picker.
  const fileRef = useRef<globalThis.File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Sync existingUrl prop
  useEffect(() => {
    if (existingUrl) {
      setStatus('done');
    }
  }, [existingUrl]);

  // Warn before leaving during upload
  useEffect(() => {
    if (status !== 'uploading') return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [status]);

  // Mobile resilience: restore UI from ref after page resume
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && fileRef.current && status === 'idle') {
        setFileName(fileRef.current.name);
        setFileSize(fileRef.current.size);
        setStatus('selected');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [status]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (accept === '.pdf' && !isPdf) {
      setErrorMsg('Invalid file type. Please select a PDF.');
      setStatus('error');
      return;
    }

    // Validate size
    if (file.size / (1024 * 1024) > maxSizeMB) {
      setErrorMsg(`File too large. Max size is ${maxSizeMB}MB.`);
      setStatus('error');
      return;
    }

    // Store in ref (survives mobile page suspensions)
    fileRef.current = file;
    setFileName(file.name);
    setFileSize(file.size);
    setErrorMsg('');
    setStatus('selected');
  }, [accept, maxSizeMB]);

  const handleUpload = useCallback(async () => {
    const file = fileRef.current;
    if (!file || status === 'uploading') return;

    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');

    try {
      const result = await uploadPdfToNotesStorage({
        bucket,
        file,
        onProgress: (p) => setProgress(p),
      });

      setProgress(100);
      setStatus('done');
      onUploadComplete(result.publicUrl, file.name);
      toast({ title: '✅ Upload Complete', description: 'PDF uploaded successfully.' });
    } catch (err) {
      const msg = mapUploadErrorToMessage(err, maxSizeMB);
      console.error('[FileUploader] Upload failed:', err);
      setErrorMsg(msg);
      setStatus('error');
      toast({ title: 'Upload Failed', description: msg, variant: 'destructive' });
    }
  }, [bucket, maxSizeMB, onUploadComplete, status, toast]);

  const handleClear = useCallback(() => {
    if (status === 'uploading') return;
    fileRef.current = null;
    setFileName('');
    setFileSize(0);
    setProgress(0);
    setErrorMsg('');
    setStatus('idle');
    if (inputRef.current) inputRef.current.value = '';
  }, [status]);

  const handleRetry = useCallback(() => {
    if (fileRef.current) {
      setStatus('selected');
      setErrorMsg('');
      setProgress(0);
    } else {
      handleClear();
    }
  }, [handleClear]);

  // ── Hidden file input (always in DOM for mobile) ──
  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      onChange={handleFileSelect}
      className="hidden"
      // Prevent the input from triggering a form submit
      onClick={(e) => e.stopPropagation()}
    />
  );

  // ── IDLE: show file picker button ──
  if (status === 'idle') {
    return (
      <div className="space-y-2 w-full">
        {fileInput}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-accent/30 transition-colors active:scale-[0.98]"
        >
          <Upload className="w-10 h-10 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Tap to select PDF</span>
          <span className="text-xs text-muted-foreground">PDF only • Max {maxSizeMB}MB</span>
        </button>
      </div>
    );
  }

  // ── SELECTED: show file info + upload button ──
  if (status === 'selected') {
    return (
      <div className="space-y-3 w-full">
        {fileInput}
        <div className="border rounded-xl p-4 bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <File className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">{(fileSize / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={handleClear} className="shrink-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Button type="button" className="w-full min-h-[48px] text-base" onClick={handleUpload}>
          <Upload className="w-4 h-4 mr-2" /> Upload PDF
        </Button>
      </div>
    );
  }

  // ── UPLOADING: show progress ──
  if (status === 'uploading') {
    return (
      <div className="space-y-3 w-full">
        {fileInput}
        <div className="border rounded-xl p-4 bg-muted/50 space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">Uploading… {Math.round(progress)}%</p>
            </div>
          </div>
          <Progress value={progress} className="h-2.5" />
        </div>
      </div>
    );
  }

  // ── DONE: show success ──
  if (status === 'done') {
    return (
      <div className="space-y-2 w-full">
        {fileInput}
        <div className="border rounded-xl p-4 bg-green-500/5 border-green-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">File Uploaded ✅</p>
              <p className="text-xs text-muted-foreground truncate">{fileName || 'Existing file'}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>Replace</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR: show error + retry ──
  return (
    <div className="space-y-3 w-full">
      {fileInput}
      <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/5 p-3 rounded-lg">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{errorMsg}</span>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1 min-h-[44px]" onClick={handleClear}>
          Choose Another
        </Button>
        {fileRef.current && (
          <Button type="button" className="flex-1 min-h-[44px]" onClick={handleRetry}>
            Retry Upload
          </Button>
        )}
      </div>
    </div>
  );
}
