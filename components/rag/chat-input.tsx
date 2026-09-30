"use client";

import * as React from "react";
import { ArrowUp, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSubmit: (question: string) => void;
  isPending: boolean;
}

export function ChatInput({ onSubmit, isPending }: ChatInputProps) {
  const [value, setValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  // Fokus kembali ke kolom input setelah jawaban selesai.
  React.useEffect(() => {
    if (!isPending) textareaRef.current?.focus();
  }, [isPending]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isPending) return;
    onSubmit(trimmed);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="border-t border-border bg-[hsl(var(--input-container-bg))] px-4 pb-3 pt-3 backdrop-blur-md">
      <form
        onSubmit={handleSubmit}
        className="chat-input-glow mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-[hsl(var(--input-box-bg))] py-2 pl-4 pr-2 transition-shadow"
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tanyakan tentang regulasi asuransi OJK…"
          aria-label="Pertanyaan"
          rows={1}
          disabled={isPending}
          className="flex-1 resize-none bg-transparent py-2 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
          style={{ maxHeight: "160px" }}
        />
        <button
          type="submit"
          disabled={isPending || !value.trim()}
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-35"
          aria-label="Kirim pertanyaan"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </form>
      <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
        Enter untuk kirim, Shift+Enter untuk baris baru. Verifikasi jawaban dengan dokumen resmi sebelum dijadikan dasar keputusan.
      </p>
    </div>
  );
}
