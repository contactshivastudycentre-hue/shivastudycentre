import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, File, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState(existingUrl || '');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (accept === '.pdf' && file.type !== 'application/pdf') {
      setError('Please select a PDF file.');
      return;
    }

    // Validate file size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File size must be less than ${maxSizeMB}MB.`);
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

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${timestamp}-${safeName}`;

      // Simulate progress (Supabase doesn't provide real upload progress)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setProgress(100);
      setUploadedUrl(urlData.publicUrl);
      onUploadComplete(urlData.publicUrl, selectedFile.name);

      toast({
        title: 'Upload Complete',
        description: 'File uploaded successfully.',
      });
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
      toast({
        title: 'Upload Failed',
        description: err.message || 'Failed to upload file.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadedUrl('');
    setProgress(0);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* File Input */}
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
          <p className="text-foreground font-medium mb-1">
            Click to upload or drag and drop
          </p>
          <p className="text-sm text-muted-foreground">
            {accept === '.pdf' ? 'PDF files only' : accept} (max {maxSizeMB}MB)
          </p>
        </div>
      )}

      {/* Selected File Preview */}
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

          {/* Upload Progress */}
          {isUploading && (
            <div className="mt-4 space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Uploading... {progress}%
              </p>
            </div>
          )}

          {/* Upload Button */}
          {!isUploading && (
            <Button className="w-full mt-4" onClick={uploadFile}>
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
          )}
        </div>
      )}

      {/* Uploaded Success */}
      {uploadedUrl && (
        <div className="border rounded-xl p-4 bg-success/5 border-success/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">File Uploaded</p>
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

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
