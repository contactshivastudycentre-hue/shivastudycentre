import { useState, useRef } from 'react';
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

const UPLOAD_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;

async function uploadWithRetry(
  bucket: string,
  filePath: string,
  file: File,
  retries = MAX_RETRIES
): Promise<{ data: any; error: any }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`[FileUploader] Upload attempt ${attempt + 1}/${retries + 1} for ${filePath}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

      const result = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearTimeout(timeout);

      if (result.error) {
        console.error(`[FileUploader] Attempt ${attempt + 1} error:`, result.error.message);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return result;
      }

      console.log('[FileUploader] Upload succeeded:', result.data);
      return result;
    } catch (err: any) {
      console.error(`[FileUploader] Attempt ${attempt + 1} exception:`, err.message);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return { data: null, error: err };
    }
  }
  return { data: null, error: new Error('Upload failed after all retries') };
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState(existingUrl || '');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    console.log('[FileUploader] File selected:', file.name, file.type, `${(file.size / 1024 / 1024).toFixed(2)}MB`);

    if (accept === '.pdf' && file.type !== 'application/pdf') {
      setError('Please select a PDF file.');
      return;
    }

    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File size must be less than ${maxSizeMB}MB. Current: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      return;
    }

    setSelectedFile(file);
    setUploadedUrl('');
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setProgress(0);
    setError(null);

    // Check auth session first
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setError('You must be logged in to upload files. Please refresh and log in again.');
      setIsUploading(false);
      console.error('[FileUploader] No active session');
      return;
    }
    console.log('[FileUploader] Session verified, user:', sessionData.session.user.id);

    const timestamp = Date.now();
    const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${timestamp}-${safeName}`;

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 8, 85));
    }, 300);

    const { data, error: uploadError } = await uploadWithRetry(bucket, filePath, selectedFile);

    clearInterval(progressInterval);

    if (uploadError || !data) {
      const msg = uploadError?.message || 'Upload failed after retries.';
      console.error('[FileUploader] Final upload error:', msg);
      
      let userMsg = msg;
      if (msg.includes('exceeded') || msg.includes('limit')) {
        userMsg = 'File is too large. Maximum size is 10MB.';
      } else if (msg.includes('not found') || msg.includes('Bucket')) {
        userMsg = 'Storage not configured. Please contact admin.';
      } else if (msg.includes('policy') || msg.includes('denied') || msg.includes('security')) {
        userMsg = 'Permission denied. Please ensure you are logged in as admin.';
      } else if (msg.includes('timeout') || msg.includes('abort') || msg.includes('network') || msg.includes('fetch')) {
        userMsg = 'Network error. Please check your connection and try again.';
      }

      setError(userMsg);
      toast({ title: 'Upload Failed', description: userMsg, variant: 'destructive' });
      setIsUploading(false);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    console.log('[FileUploader] Public URL:', urlData.publicUrl);

    setProgress(100);
    setUploadedUrl(urlData.publicUrl);
    onUploadComplete(urlData.publicUrl, selectedFile.name);
    setIsUploading(false);

    toast({ title: '✅ Upload Complete', description: 'PDF uploaded successfully.' });
  };

  const clearFile = () => {
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
          className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
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
          <p className="text-foreground font-medium mb-1">Click to upload</p>
          <p className="text-sm text-muted-foreground">
            PDF files only (max {maxSizeMB}MB)
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
                Uploading... {progress}%
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
