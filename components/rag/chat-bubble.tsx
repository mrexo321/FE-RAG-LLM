"use client";

import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Check,
  Copy,
  Info,
  RotateCcw,
  ShieldCheck,
  Square,
} from "lucide-react";

import type { ChatMessage } from "@/types/rag";
import { formatAnswer } from "@/lib/format-answer";
import { assessConfidence } from "@/lib/confidence";
import { TypingIndicator } from "@/components/rag/typing-indicator";
import { useChat } from "@/components/chat/chat-provider";
import { useSmoothText } from "@/hooks/use-smooth-teks";

interface ChatBubbleProps {
  message: ChatMessage;
  isLast: boolean;
  onRegenerate: () => void;
  onFollowUp: (text: string) => void;
}

const FOLLOW_UPS = [
  "Jelaskan dengan bahasa yang lebih sederhana",
  "Berikan contoh penerapannya",
  "Apa dasar hukum dan pasalnya?",
];

const METHOD_LABEL: Record<string, string> = {
  PGVECTOR: "Pencarian semantik",
  KEYWORD_FALLBACK: "Kata kunci",
  HYBRID_SEARCH: "Pencarian hybrid",
  GREETING: "Sapaan",
};

export function ChatBubble({ message, isLast, onRegenerate, onFollowUp }: ChatBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="animate-message-in flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  // Tampilkan indikator loading saat belum ada teks jawaban yang mengalir
  if ((message.isLoading || message.streaming) && !message.content) {
    return (
      <div className="animate-message-in flex gap-3">
        <AssistantAvatar />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 rounded-2xl rounded-tl-sm border border-border bg-[hsl(var(--bubble-ai-bg))] px-4 py-3">
            <TypingIndicator />
            <span className="text-xs text-muted-foreground" aria-live="polite">
              Mencari jawaban yang relevan…
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Error tanpa konten parsial sama sekali
  if (message.isError && !message.content) {
    return (
      <div className="animate-message-in flex gap-3">
        <AssistantAvatar isError />
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="space-y-2">
              <p>Gagal memproses jawaban dari server.</p>
              <p className="text-xs text-muted-foreground">
                Pastikan backend berjalan dan URL API di .env.local sudah benar.
              </p>
              {isLast && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden /> Coba lagi
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AssistantAnswer
      message={message}
      isLast={isLast}
      onRegenerate={onRegenerate}
      onFollowUp={onFollowUp}
    />
  );
}

// ── Jawaban Assistant ──────────────────────────────────────────────

function AssistantAnswer({ message, isLast, onRegenerate, onFollowUp }: ChatBubbleProps) {
  const { clarifyQuestion, handleCiteClick, openSidebar } = useChat();
  const [copied, setCopied] = React.useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = React.useState(false);
  const [feedbackReason, setFeedbackReason] = React.useState("");
  const [feedbackComment, setFeedbackComment] = React.useState("");

  const isStreaming = Boolean(message.streaming || message.isLoading);
  const isDone = !isStreaming;
  const confidence = assessConfidence(message);

  // Menggunakan Smooth Text Hook untuk transisi streaming halus ala Claude AI
  const smoothContent = useSmoothText(message.content, isStreaming);

  const handleCite = React.useCallback(
    (idx: number) => {
      handleCiteClick(message.id, idx);
    },
    [handleCiteClick, message.id]
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  }

  const handleOpenSources = () => {
    openSidebar(message.id);
  };

  const canFollowUp =
    isLast && isDone && message.retrievalMethod !== "GREETING" && message.retrievalMethod !== "NONE";

  return (
    <div className="animate-message-in flex gap-3">
      <AssistantAvatar />
      <div className="min-w-0 flex-1 space-y-3">
        {/* Bubble Jawaban Utama */}
        <div className="rounded-2xl rounded-tl-sm border border-border bg-[hsl(var(--bubble-ai-bg))] px-5 py-4 shadow-sm transition-all duration-200">
          {/* Banner Keandalan Rendah / Tidak Ada */}
          {isDone && (confidence === "low" || confidence === "none") && (
            <div className="mb-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="flex-1 space-y-1.5">
                  <p className="text-foreground/90 font-medium">
                    {confidence === "none"
                      ? "Tidak ditemukan dasar di dokumen yang tersedia."
                      : "Dasar jawaban ini kurang kuat. Periksa dokumen sumber sebelum dipakai."}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-0.5">
                    {message.sources && message.sources.length > 0 && (
                      <button
                        type="button"
                        onClick={handleOpenSources}
                        className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
                      >
                        Lihat sumber
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => clarifyQuestion("Maksud saya: ")}
                      className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
                    >
                      Perjelas pertanyaan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Isi Teks Jawaban dengan Smooth Format & Cursor */}
          <div className="relative text-[15px] leading-7 text-[hsl(var(--bubble-ai-text))] transition-all">
            {formatAnswer(smoothContent, {
              sources: message.sources,
              onCite: handleCite,
            })}

            {/* Smooth Breathing Cursor Magnetik ala Claude */}
            {isStreaming && (
              <span
                className="ml-1 inline-block h-4 w-2 rounded-full bg-primary/80 align-middle shadow-xs transition-all duration-75 animate-pulse"
                style={{
                  display: "inline-block",
                  verticalAlign: "baseline",
                }}
              />
            )}
          </div>

          {/* Tanda Dihentikan (Stopped) */}
          {message.stopped && (
            <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 font-medium">
                <Square className="h-3 w-3 fill-muted-foreground" />
                Dihentikan oleh pengguna
              </span>
              <button
                type="button"
                onClick={onRegenerate}
                className="font-semibold text-primary hover:underline"
              >
                Buat ulang
              </button>
            </div>
          )}

          {/* Error di tengah stream */}
          {message.isError && (
            <div className="mt-3 flex items-center justify-between border-t border-destructive/20 pt-2.5 text-xs text-destructive">
              <span>Streaming terputus sebelum selesai.</span>
              <button
                type="button"
                onClick={onRegenerate}
                className="font-semibold text-destructive underline"
              >
                Coba lagi
              </button>
            </div>
          )}

          {/* Footer Aksi & Indikator */}
          {isDone && !message.stopped && (
            <div className="animate-fade-in mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              {/* Lencana Keandalan */}
              {confidence === "high" && (
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-[hsl(var(--success))]/10 px-2 py-0.5 text-[11px] font-medium text-[hsl(var(--success))]"
                  title="Tingkat keandalan tinggi didukung rujukan regulasi"
                >
                  <ShieldCheck className="h-3 w-3" />
                  <span>Didukung {message.sources?.length ?? 0} sumber</span>
                </span>
              )}

              {confidence === "medium" && (
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                  title="Periksa dokumen sumber rujukan"
                >
                  <Info className="h-3 w-3" />
                  <span>Periksa sumber</span>
                </span>
              )}

              {message.latencyMs != null && (
                <span className="text-[11px] text-muted-foreground">
                  {(message.latencyMs / 1000).toFixed(1)} detik
                </span>
              )}

              {message.retrievalMethod && METHOD_LABEL[message.retrievalMethod] && (
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                  {METHOD_LABEL[message.retrievalMethod]}
                </span>
              )}

              {/* Tombol aksi */}
              <div className="ml-auto flex items-center gap-1">
                <IconButton label={copied ? "Tersalin" : "Salin jawaban"} onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> : <Copy className="h-3.5 w-3.5" />}
                </IconButton>

                {isLast && (
                  <IconButton label="Buat ulang jawaban" onClick={onRegenerate}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </IconButton>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tombol "Lihat N sumber" */}
        {isDone && message.sources && message.sources.length > 0 && !message.stopped && (
          <button
            type="button"
            onClick={handleOpenSources}
            className="animate-fade-in flex items-center gap-2 rounded-lg bg-[hsl(var(--source-btn-bg))] px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-[hsl(var(--source-btn-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BookOpen className="h-3.5 w-3.5 text-accent" aria-hidden />
            <span>Lihat {message.sources.length} sumber rujukan</span>
          </button>
        )}

        {/* Saran Pertanyaan Lanjutan */}
        {canFollowUp && (
          <div className="animate-fade-in flex flex-wrap gap-2 pt-1">
            {FOLLOW_UPS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onFollowUp(q)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

function AssistantAvatar({ isError = false }: { isError?: boolean }) {
  return (
    <div
      className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
        isError ? "bg-destructive/15 text-destructive" : "bg-primary text-primary-foreground"
      }`}
    >
      <ShieldCheck className="h-4 w-4" aria-hidden />
    </div>
  );
}
