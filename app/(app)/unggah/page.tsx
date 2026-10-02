"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Info,
  RotateCcw,
  Trash2,
  Upload,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";

import type { FileQueueItem, FileStatus } from "@/types/rag";
import { useUploadPdf } from "@/hooks/use-upload-pdf";
import { useToast } from "@/components/toast-provider";
import { Badge } from "@/components/ui/badge";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

type QueueAction =
  | { type: "ADD_FILES"; files: File[] }
  | { type: "SET_STATUS"; id: string; status: FileStatus; error?: string; progress?: number; abortController?: AbortController }
  | { type: "UPDATE_PROGRESS"; id: string; progress: number }
  | { type: "REMOVE_FILE"; id: string }
  | { type: "CLEAR_FINISHED" }
  | { type: "CLEAR_ALL" }
  | { type: "RESET_FOR_RETRY"; id: string };

function queueReducer(state: FileQueueItem[], action: QueueAction): FileQueueItem[] {
  switch (action.type) {
    case "ADD_FILES": {
      const existingKeys = new Set(state.map((item) => `${item.file.name}_${item.file.size}`));
      const newItems: FileQueueItem[] = [];

      for (const file of action.files) {
        const key = `${file.name}_${file.size}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          newItems.push({
            id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            file,
            status: "menunggu",
            progress: 0,
          });
        }
      }
      return [...state, ...newItems];
    }

    case "SET_STATUS":
      return state.map((item) =>
        item.id === action.id
          ? {
              ...item,
              status: action.status,
              error: action.error ?? item.error,
              progress: action.progress !== undefined ? action.progress : item.progress,
              abortController: action.abortController !== undefined ? action.abortController : item.abortController,
            }
          : item
      );

    case "UPDATE_PROGRESS":
      return state.map((item) =>
        item.id === action.id
          ? {
              ...item,
              progress: action.progress,
              status: action.progress >= 100 ? "memproses" : item.status,
            }
          : item
      );

    case "REMOVE_FILE":
      return state.filter((item) => item.id !== action.id);

    case "CLEAR_FINISHED":
      return state.filter((item) => item.status !== "selesai");

    case "CLEAR_ALL":
      return [];

    case "RESET_FOR_RETRY":
      return state.map((item) =>
        item.id === action.id
          ? {
              ...item,
              status: "menunggu",
              progress: 0,
              error: undefined,
              abortController: undefined,
            }
          : item
      );

    default:
      return state;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const { toast } = useToast();
  const uploadMutation = useUploadPdf();
  const [queue, dispatch] = React.useReducer(queueReducer, []);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isUploadingQueue, setIsUploadingQueue] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const activeControllersRef = React.useRef<Map<string, AbortController>>(new Map());

  // Handle addition and validation of files
  const handleValidateAndAdd = (files: FileList | File[]) => {
    const validFiles: File[] = [];
    let invalidCount = 0;
    let oversizeCount = 0;

    Array.from(files).forEach((file) => {
      const isPdf =
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        invalidCount++;
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        oversizeCount++;
        return;
      }
      validFiles.push(file);
    });

    if (invalidCount > 0) {
      toast(`${invalidCount} file diabaikan karena bukan format PDF`, "error");
    }
    if (oversizeCount > 0) {
      toast(`${oversizeCount} file diabaikan karena ukuran melebihi 20MB`, "error");
    }

    if (validFiles.length > 0) {
      dispatch({ type: "ADD_FILES", files: validFiles });
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleValidateAndAdd(e.dataTransfer.files);
    }
  };

  // Upload sequential loop
  const startUploadQueue = async () => {
    if (isUploadingQueue) return;
    setIsUploadingQueue(true);

    const pendingItems = queue.filter(
      (item) => item.status === "menunggu" || item.status === "gagal" || item.status === "dibatalkan"
    );

    let successCount = 0;
    let failureCount = 0;

    for (const item of pendingItems) {
      const controller = new AbortController();
      activeControllersRef.current.set(item.id, controller);

      dispatch({
        type: "SET_STATUS",
        id: item.id,
        status: "mengunggah",
        progress: 0,
        abortController: controller,
      });

      try {
        await uploadMutation.mutateAsync({
          file: item.file,
          signal: controller.signal,
          onProgress: (pct) => {
            dispatch({ type: "UPDATE_PROGRESS", id: item.id, progress: pct });
          },
        });

        dispatch({
          type: "SET_STATUS",
          id: item.id,
          status: "selesai",
          progress: 100,
        });
        successCount++;
      } catch (err: unknown) {
        const error = err as Error;
        if (error.name === "AbortError" || controller.signal.aborted) {
          dispatch({
            type: "SET_STATUS",
            id: item.id,
            status: "dibatalkan",
            error: "Dibatalkan oleh pengguna",
          });
        } else {
          dispatch({
            type: "SET_STATUS",
            id: item.id,
            status: "gagal",
            error: error.message || "Gagal mengunggah file ke backend",
          });
          failureCount++;
        }
      } finally {
        activeControllersRef.current.delete(item.id);
      }
    }

    setIsUploadingQueue(false);

    if (successCount > 0 && failureCount === 0) {
      toast(`Berhasil mengunggah ${successCount} dokumen ke repositori!`, "success");
    } else if (successCount > 0 && failureCount > 0) {
      toast(`${successCount} berhasil diunggah, ${failureCount} gagal`, "info");
    } else if (failureCount > 0) {
      toast(`${failureCount} dokumen gagal diunggah`, "error");
    }
  };

  // Cancel single upload
  const handleCancelItem = (item: FileQueueItem) => {
    const controller = activeControllersRef.current.get(item.id);
    if (controller) {
      controller.abort();
    }
  };

  // Retry single file
  const handleRetryItem = (item: FileQueueItem) => {
    dispatch({ type: "RESET_FOR_RETRY", id: item.id });
  };

  // Summary counts
  const totalCount = queue.length;
  const finishedCount = queue.filter((i) => i.status === "selesai").length;
  const pendingCount = queue.filter(
    (i) => i.status === "menunggu" || i.status === "gagal" || i.status === "dibatalkan"
  ).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      {/* ── Page Title ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Unggah Dokumen Regulasi
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Tambahkan file PDF regulasi POJK, SEOJK, atau surat edaran untuk memperkaya pengetahuan RAG AI.
        </p>
      </div>

      {/* ── Upload Dropzone ───────────────────────────────────────── */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all ${
          isDragOver
            ? "border-primary bg-primary/10 shadow-lg"
            : "border-border bg-card/50 hover:border-primary/50 hover:bg-card"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleValidateAndAdd(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UploadCloud className="h-7 w-7" />
        </div>

        <h3 className="mt-4 text-base font-semibold text-foreground">
          Pilih file PDF atau seret ke sini
        </h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          Mendukung multi-file upload dokumen regulasi PDF resmi hingga ukuran maksimal 20 MB per file.
        </p>

        <button
          type="button"
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"
        >
          <Upload className="h-4 w-4" />
          <span>Jelajahi File</span>
        </button>
      </div>

      {/* ── Queue Section ─────────────────────────────────────────── */}
      {queue.length > 0 && (
        <section className="mt-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Antrean Berkas</h2>
              <Badge variant="muted" className="text-xs">
                {finishedCount}/{totalCount} selesai
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {finishedCount > 0 && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "CLEAR_FINISHED" })}
                  disabled={isUploadingQueue}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  Bersihkan yang selesai
                </button>
              )}

              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "CLEAR_ALL" })}
                  disabled={isUploadingQueue}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  Hapus semua
                </button>
              )}

              <button
                type="button"
                onClick={startUploadQueue}
                disabled={isUploadingQueue || pendingCount === 0}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                <UploadCloud className="h-4 w-4" />
                <span>
                  {isUploadingQueue
                    ? "Sedang Mengunggah..."
                    : `Unggah ${pendingCount} Berkas`}
                </span>
              </button>
            </div>
          </div>

          {/* Queue List */}
          <div className="space-y-3">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs sm:text-sm font-semibold text-foreground">
                        {item.file.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatBytes(item.file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status badges */}
                    {item.status === "selesai" && (
                      <span className="flex items-center gap-1 text-xs font-medium text-[hsl(var(--success))]">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Selesai</span>
                      </span>
                    )}

                    {item.status === "gagal" && (
                      <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>Gagal</span>
                      </span>
                    )}

                    {item.status === "dibatalkan" && (
                      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <XCircle className="h-4 w-4" />
                        <span>Dibatalkan</span>
                      </span>
                    )}

                    {item.status === "mengunggah" && (
                      <span className="text-xs font-medium text-primary">
                        Mengunggah {item.progress}%
                      </span>
                    )}

                    {item.status === "memproses" && (
                      <span className="text-xs font-medium text-amber-500 animate-pulse">
                        Memproses di backend...
                      </span>
                    )}

                    {item.status === "menunggu" && (
                      <span className="text-xs text-muted-foreground">Menunggu</span>
                    )}

                    {/* Actions */}
                    {item.status === "mengunggah" && (
                      <button
                        type="button"
                        onClick={() => handleCancelItem(item)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Batalkan proses upload"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}

                    {(item.status === "gagal" || item.status === "dibatalkan") && (
                      <button
                        type="button"
                        onClick={() => handleRetryItem(item)}
                        disabled={isUploadingQueue}
                        className="rounded p-1 text-primary hover:bg-primary/10"
                        title="Coba upload ulang"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}

                    {item.status !== "mengunggah" && item.status !== "memproses" && (
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "REMOVE_FILE", id: item.id })}
                        disabled={isUploadingQueue}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                        title="Hapus dari antrean"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {(item.status === "mengunggah" || item.status === "memproses") && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-200"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}

                {/* Error message */}
                {item.error && (
                  <p className="text-[11px] text-destructive">{item.error}</p>
                )}
              </div>
            ))}
          </div>

          {/* Finished Callout */}
          {finishedCount > 0 && !isUploadingQueue && (
            <div className="flex items-center justify-between rounded-xl border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 p-4">
              <span className="text-xs font-medium text-foreground">
                Dokumen telah diunggah dan otomatis terindeks ke repositori RAG.
              </span>
              <Link
                href="/dokumen"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <span>Lihat di Dokumen</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ── Guidelines Info Section ───────────────────────────────── */}
      <section className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Info className="h-4 w-4 text-primary" />
          <span>Panduan Pengunggahan Dokumen Regulasi</span>
        </div>
        <ul className="mt-3 space-y-2 text-xs text-muted-foreground leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="font-semibold text-foreground">• Format:</span>
            <span>Hanya file PDF teks asli regulasi (Peraturan OJK, Surat Edaran OJK, Keputusan Dewan Komisioner).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold text-foreground">• Ukuran berkas:</span>
            <span>Maksimal 20 MB per file PDF.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold text-foreground">• Pemrosesan OCR:</span>
            <span>PDF hasil scan gambar tanpa lapisan teks memerlukan tahap OCR agar pasal dan ayat dapat terbaca oleh model AI RAG.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-semibold text-foreground">• Pengindeksan otomatis:</span>
            <span>Setelah upload selesai, backend langsung mengekstraksi teks, melakukan chunking, dan menyimpan embedding ke database vektor.</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
