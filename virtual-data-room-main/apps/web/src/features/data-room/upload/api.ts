import { api } from "@/lib/api";

export interface UploadIntent {
  fileId: string;
  name: string;
  uploadUrl: string;
}

export interface CompletedUpload {
  id: string;
  name: string;
  folderId: string | null;
}

export async function createUploadIntent(input: {
  dataRoomId: string;
  folderId?: string;
  name: string;
  size: number;
  mimeType: string;
}): Promise<UploadIntent> {
  const { data } = await api.post<UploadIntent>("/files/upload-intent", input);
  return data;
}

export async function completeUpload(fileId: string): Promise<CompletedUpload> {
  const { data } = await api.post<CompletedUpload>(`/files/${fileId}/complete`);
  return data;
}

/**
 * Replicates supabase-js's internal uploadToSignedUrl for a Blob body, using
 * raw XHR instead of fetch so we get upload progress events.
 */
export function uploadFileToStorage(
  uploadUrl: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_ANON_KEY);
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (event) => {
      onProgress(event.lengthComputable ? (event.loaded / event.total) * 100 : 0);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed"));

    const formData = new FormData();
    formData.append("cacheControl", "3600");
    formData.append("", file);
    xhr.send(formData);
  });
}
