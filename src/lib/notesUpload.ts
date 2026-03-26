import { Upload as TusUpload } from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';

export const MULTIPART_THRESHOLD_BYTES = 5 * 1024 * 1024;

interface UploadPdfParams {
  bucket: string;
  file: File;
  onProgress?: (progress: number) => void;
}

const ONE_YEAR_CACHE_SECONDS = '31536000';

const sanitizeFileName = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/_+/g, '_');

export const createNotesFilePath = (fileName: string) => {
  const timestamp = Date.now();
  return `notes/${timestamp}-${sanitizeFileName(fileName)}`;
};

const uploadViaTus = async ({
  bucket,
  file,
  filePath,
  accessToken,
  onProgress,
}: {
  bucket: string;
  file: File;
  filePath: string;
  accessToken: string;
  onProgress?: (progress: number) => void;
}) => {
  const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`;
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  await new Promise<void>((resolve, reject) => {
    const upload = new TusUpload(file, {
      endpoint,
      chunkSize: 2 * 1024 * 1024,
      retryDelays: [0, 800, 1500, 3000],
      removeFingerprintOnSuccess: true,
      uploadDataDuringCreation: true,
      metadata: {
        bucketName: bucket,
        objectName: filePath,
        contentType: 'application/pdf',
        cacheControl: ONE_YEAR_CACHE_SECONDS,
      },
      headers: {
        authorization: `Bearer ${accessToken}`,
        apikey,
        'x-upsert': 'true',
      },
      onProgress: (uploaded, total) => {
        if (!total) return;
        const percentage = Math.round((uploaded / total) * 100);
        onProgress?.(Math.min(99, percentage));
      },
      onError: (error) => reject(error),
      onSuccess: () => resolve(),
    });

    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    }).catch(reject);
  });
};

export async function uploadPdfToNotesStorage({ bucket, file, onProgress }: UploadPdfParams) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error('Not logged in. Please refresh and log in again.');
  }

  const filePath = createNotesFilePath(file.name);
  const shouldUseMultipart = file.size > MULTIPART_THRESHOLD_BYTES;

  if (shouldUseMultipart) {
    await uploadViaTus({
      bucket,
      file,
      filePath,
      accessToken,
      onProgress,
    });
  } else {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: ONE_YEAR_CACHE_SECONDS,
        upsert: true,
      });

    if (error) {
      throw error;
    }
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return {
    filePath,
    publicUrl: urlData.publicUrl,
    usedMultipart: shouldUseMultipart,
  };
}

export function mapUploadErrorToMessage(error: unknown, maxSizeMB: number) {
  const rawMessage = (error as any)?.message || String(error || 'Upload failed');
  const msg = rawMessage.toLowerCase();

  if (msg.includes('duplicate key')) return 'A pending duplicate request already exists.';
  if (msg.includes('entity too large') || msg.includes('payload too large') || msg.includes('size')) {
    return `PDF is too large. Please upload a file under ${maxSizeMB}MB.`;
  }
  if (msg.includes('mime') || msg.includes('type')) return 'Invalid file type. Please upload a PDF only.';
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout') || msg.includes('abort')) {
    return 'Network error while uploading. Please retry on a stable connection.';
  }
  if (msg.includes('permission') || msg.includes('denied') || msg.includes('policy')) {
    return 'Upload blocked. Only admin accounts can upload notes.';
  }

  return rawMessage || 'Upload failed. Please try again.';
}
