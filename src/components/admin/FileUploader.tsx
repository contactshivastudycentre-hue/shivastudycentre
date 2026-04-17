import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, File as FileIcon, X, CheckCircle, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadPdfToNotesStorage, mapUploadErrorToMessage } from '@/lib/notesUpload';
import { supabase } from '@/integrations/supabase/client';

interface FileUploaderProps {
  bucket: string;
  accept?: string;
  maxSizeMB?: number;
  onUploadComplete: (url: string, fileName: string) => void;
  existingUrl?: string;
  /** When true the picker shows image-friendly UI text */
  isImage?: boolean;
}

export function FileUploader({
  bucket,
  accept = '.pdf',
  maxSizeMB = 10,
  onUploadComplete,
  existingUrl,
  isImage = false,
}: FileUploaderProps) {
  const [status, setStatus] = useState<'idle' | 'selected' | 'uploading' | 'done' | 'error'>(existingUrl ? 'done' : 'idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  // Mirror to BOTH ref + state for mobile resilience
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const fileRef = useRef<globalThis.File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => { if (existingUrl) setStatus('done'); }, [existingUrl]);

  // Warn before leaving during upload
  useEffect(() => {
    if (status !== 'uploading') return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [status]);

  // Mobile resume
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && (fileRef.current || selectedFile) && status === 'idle') {
        const f = fileRef.current || selectedFile!;
        setFileName(f.name);
        setFileSize(f.size);
        setStatus('selected');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [status, selectedFile]);

  const validateFile = (file: globalThis.File): string | null => {
    // Image validation
    if (isImage || accept.includes('image')) {
      if (!file.type.startsWith('image/')) return 'Invalid file type. Please select an image.';
    } else if (accept === '.pdf') {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) return 'Invalid file type. Please select a PDF.';
    }
    if (file.size / (1024 * 1024) > maxSizeMB) return `File too large. Max size is ${maxSizeMB}MB.`;
    return null;
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setErrorMsg(err); setStatus('error'); return; }
    fileRef.current = file;
    setSelectedFile(file);
    setFileName(file.name);
    setFileSize(file.size);
    setErrorMsg('');
    setStatus('selected');
  }, [accept, maxSizeMB, isImage]);

  const handleUpload = useCallback(async () => {
    const file = fileRef.current || selectedFile;
    if (!file || status === 'uploading') return;
    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');

    try {
      let publicUrl = '';

      if (isImage || accept.includes('image')) {
        // Direct Supabase upload for images (small, no need for tus)
        const ts = Date.now();
        const safe = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `${ts}-${safe}`;
        setProgress(40);
        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          cacheControl: '31536000',
          upsert: true,
          contentType: file.type,
        });
        if (error) throw error;
        setProgress(90);
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        publicUrl = data.publicUrl;
      } else {
        const result = await uploadPdfToNotesStorage({
          bucket,
          file,
          onProgress: (p) => setProgress(p),
        });
        publicUrl = result.publicUrl;
      }

      setProgress(100);
      setStatus('done');
      onUploadComplete(publicUrl, file.name);
      toast({ title: '✅ Upload Complete', description: `${isImage ? 'Image' : 'PDF'} uploaded successfully.` });
    } catch (err) {
      const msg = mapUploadErrorToMessage(err, maxSizeMB);
      console.error('[FileUploader] Upload failed:', err);
      setErrorMsg(msg);
      setStatus('error');
      toast({ title: 'Upload Failed', description: msg, variant: 'destructive' });
    }
  }, [bucket, maxSizeMB, onUploadComplete, status, toast, selectedFile, isImage, accept]);

  const handleClear = useCallback(() => {
    if (status === 'uploading') return;
    fileRef.current = null;
    setSelectedFile(null);
    setFileName('');
    setFileSize(0);
    setProgress(0);
    setErrorMsg('');
    setStatus('idle');
    if (inputRef.current) inputRef.current.value = '';
  }, [status]);

  const handleRetry = useCallback(() => {
    if (fileRef.current || selectedFile) {
      setStatus('selected');
      setErrorMsg('');
      setProgress(0);
    } else {
      handleClear();
    }
  }, [handleClear, selectedFile]);

  const Icon = isImage ? ImageIcon : FileIcon;
  const fileLabel = isImage ? 'image' : 'PDF';

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      onChange={handleFileSelect}
      className="hidden"
      onClick={(e) => e.stopPropagation()}
    />
  );

  if (status === 'idle') {
    return (
      <div className="space-y-2 w-full">
        {fileInput}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); inputRef.current?.click(); }}
          className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-accent/30 transition-colors active:scale-[0.98]"
        >
          <Upload className="w-10 h-10 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Tap to select {fileLabel}</span>
          <span className="text-xs text-muted-foreground">Max {maxSizeMB}MB</span>
        </button>
      </div>
    );
  }

  if (status === 'selected') {
    return (
      <div className="space-y-3 w-full">
        {fileInput}
        <div className="border rounded-xl p-4 bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
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
          <Upload className="w-4 h-4 mr-2" /> Upload {fileLabel}
        </Button>
      </div>
    );
  }

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

  if (status === 'done') {
    return (
      <div className="space-y-2 w-full">
        {fileInput}
        <div className="border rounded-xl p-4 bg-green-500/5 border-green-500/20">
          <div className="flex items-center gap-3">
            {isImage && existingUrl ? (
              <img src={existingUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">Uploaded ✅</p>
              <p className="text-xs text-muted-foreground truncate">{fileName || 'Existing file'}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>Replace</Button>
          </div>
        </div>
      </div>
    );
  }

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
        {(fileRef.current || selectedFile) && (
          <Button type="button" className="flex-1 min-h-[44px]" onClick={handleRetry}>
            Retry Upload
          </Button>
        )}
      </div>
    </div>
  );
}
