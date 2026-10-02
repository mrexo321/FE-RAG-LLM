"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";
import type { UploadResult } from "@/types/rag";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const BASE_PATH = "/api/v1/insurance-rag";

interface UploadPdfVariables {
  file: File;
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
}

/**
 * Upload satu file PDF dengan progres byte lewat XMLHttpRequest.
 * `onSuccess` meng-invalidate cache corpus.
 */
function uploadPdfWithProgress({
  file,
  onProgress,
  signal,
}: UploadPdfVariables): Promise<UploadResult> {
  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (signal) {
      if (signal.aborted) {
        reject(new DOMException("Upload dibatalkan", "AbortError"));
        return;
      }
      signal.addEventListener("abort", () => {
        xhr.abort();
      });
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve({ message: xhr.responseText } as UploadResult);
        }
      } else {
        let msg = `Upload gagal (HTTP ${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText);
          msg = body?.message ?? body?.error ?? msg;
        } catch {
          /* gunakan pesan default */
        }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Koneksi gagal saat mengunggah file."));
    };

    xhr.onabort = () => {
      reject(new DOMException("Upload dibatalkan", "AbortError"));
    };

    const form = new FormData();
    form.append("file", file);

    xhr.open("POST", `${API_BASE_URL}${BASE_PATH}/upload-pdf`);
    // Jangan set Content-Type manual, browser mengisi boundary multipart sendiri.
    xhr.send(form);
  });
}

export function useUploadPdf() {
  const queryClient = useQueryClient();

  return useMutation<UploadResult, Error, UploadPdfVariables>({
    mutationFn: uploadPdfWithProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.corpus });
    },
  });
}
