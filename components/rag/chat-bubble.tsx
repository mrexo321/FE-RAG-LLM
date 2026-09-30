"use client";

import * as React from "react";
import { AlertCircle, Check, Copy, RotateCcw, ShieldCheck } from "lucide-react";
import type { ChatMessage } from "@/types/rag";
import { formatAnswer } from "@/lib/format-answer";
import { SourcePanel } from "@/components/rag/source-panel";
import { TypingIndicator } from "@/components/rag/typing-indicator";
import { useTypewriter } from "@/hooks/use-typewriter";

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

  if (message.isLoading) {
    return (
      <div className="animate-message-in flex gap-3">
        <AssistantAvatar />
        <ThinkingBubble />
      </div>
    );
  }

  if (message.isError) {
    return (
      <div className="animate-message-in flex gap-3">
        <AssistantAvatar isError />
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="space-y-2">
              <p>{message.content}</p>
              <p className="text-xs text-muted-foreground">
                Pastikan backend berjalan dan URL API di .env.local sudah benar.
              </p>
              {isLast && (
                <button
                  onClick={onRegenerate}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
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

// ── Indikator proses agent ─────────────────────────────────────────

const STAGES = [
  "Mencari pasal yang relevan…",
  "Membaca dokumen POJK…",
  "Menyusun jawaban…",
];

function ThinkingBubble() {
  const [stage, setStage] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center gap-3 rounded-2xl rounded-tl-sm border border-border bg-[hsl(var(--bubble-ai-bg))] px-4 py-3">
      <TypingIndicator />
      <span className="text-xs text-muted-foreground" aria-live="polite">
        {STAGES[stage]}
      </span>
    </div>
  );
}

// ── Jawaban assistant ──────────────────────────────────────────────

function AssistantAnswer({ message, isLast, onRegenerate, onFollowUp }: ChatBubbleProps) {
  const [animate] = React.useState(isLast);
  const [skipped, setSkipped] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const { visibleText, isDone } = useTypewriter(message.content, 2, 35, animate && !skipped);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  }

  const canFollowUp =
    isLast && isDone && message.retrievalMethod !== "GREETING" && message.retrievalMethod !== "NONE";

  return (
    <div className="animate-message-in flex gap-3">
      <AssistantAvatar />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="rounded-2xl rounded-tl-sm border border-border bg-[hsl(var(--bubble-ai-bg))] px-5 py-4 shadow-sm">
          <div className="text-[15px] leading-7 text-[hsl(var(--bubble-ai-text))]">
            {formatAnswer(visibleText)}
            {!isDone && (
              <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-primary align-text-bottom" />
            )}
          </div>

          {!isDone ? (
            <button
              onClick={() => setSkipped(true)}
              className="mt-3 text-xs font-medium text-primary hover:underline"
            >
              Tampilkan semua
            </button>
          ) : (
            <div className="animate-fade-in mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
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

        {isDone && message.sources && message.sources.length > 0 && (
          <SourcePanel sources={message.sources} />
        )}

        {canFollowUp && (
          <div className="animate-fade-in flex flex-wrap gap-2 pt-1">
            {FOLLOW_UPS.map((q) => (
              <button
                key={q}
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
