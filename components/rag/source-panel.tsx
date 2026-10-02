"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, ExternalLink } from "lucide-react";
import type { SourceDocument } from "@/types/rag";

interface SourcePanelProps {
  sources: SourceDocument[];
  messageId?: string;
  activeIndex?: number | null;
  onActiveHandled?: () => void;
  /** Alias backward-compatible untuk activeIndex */
  highlightedIndex?: number | null;
  /** dipertahankan agar kompatibel dengan pemanggil lama */
  staggered?: boolean;
}

export function SourcePanel({
  sources,
  messageId,
  activeIndex,
  onActiveHandled,
  highlightedIndex,
}: SourcePanelProps) {
  const [open, setOpen] = React.useState(true);
  const [openCards, setOpenCards] = React.useState<Set<number>>(new Set());
  const [flashingIndex, setFlashingIndex] = React.useState<number | null>(null);

  const targetIndex = activeIndex !== undefined ? activeIndex : highlightedIndex;

  // Tangani klik sitasi: buka accordion, scroll ke kartu, dan berikan sorotan sementara 1.5 detik
  React.useEffect(() => {
    if (targetIndex !== null && targetIndex !== undefined && targetIndex >= 0) {
      setOpen(true);
      setOpenCards((prev) => new Set(prev).add(targetIndex));
      setFlashingIndex(targetIndex);

      // Scroll halus ke kartu
      setTimeout(() => {
        const el = document.getElementById(`source-card-${messageId ?? "msg"}-${targetIndex}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 50);

      const timer = setTimeout(() => {
        setFlashingIndex(null);
        onActiveHandled?.();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [targetIndex, messageId, onActiveHandled]);

  if (sources.length === 0) return null;

  function toggleCard(idx: number) {
    setOpenCards((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg bg-[hsl(var(--source-btn-bg))] px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-[hsl(var(--source-btn-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BookOpen className="h-3.5 w-3.5 text-accent" aria-hidden />
        <span>{sources.length} sumber rujukan</span>
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open && (
        <ul className="space-y-2">
          {sources.map((s, idx) => {
            const isHighlighted = flashingIndex === idx;
            return (
              <li
                key={idx}
                id={`source-card-${messageId ?? "msg"}-${idx}`}
                className={`animate-slide-up overflow-hidden rounded-xl border transition-all duration-300 ${
                  isHighlighted
                    ? "border-accent bg-accent/10 ring-2 ring-accent/60 shadow-md"
                    : "border-border bg-[hsl(var(--source-card-bg))]"
                }`}
                style={{ animationDelay: `${idx * 60}ms`, opacity: 0 }}
              >
                <SourceCard
                  source={s}
                  index={idx}
                  isHighlighted={isHighlighted}
                  expanded={openCards.has(idx)}
                  onToggle={() => toggleCard(idx)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SourceCard({
  source,
  index,
  isHighlighted,
  expanded,
  onToggle,
}: {
  source: SourceDocument;
  index: number;
  isHighlighted?: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const relevance =
    typeof source.score === "number" && source.score >= 0 && source.score <= 1
      ? Math.round(source.score * 100)
      : null;

  return (
    <>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[11px] font-semibold transition-colors ${
            isHighlighted
              ? "bg-accent text-accent-foreground font-bold shadow-sm"
              : "bg-accent/15 text-[hsl(var(--accent))]"
          }`}
        >
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold leading-snug text-foreground">
            {source.regulation}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
            {source.title}
          </span>
          {/* {(source.category || relevance !== null) && (
            <span className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
              {source.category && <span>{source.category}</span>}
              {relevance !== null && (
                <span className="flex items-center gap-1.5" title="Tingkat kemiripan dengan pertanyaan">
                  <span className="h-1 w-14 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-[hsl(var(--success))]"
                      style={{ width: `${relevance}%` }}
                    />
                  </span>
                  {relevance}%
                </span>
              )}
            </span>
          )} */}
        </span>
        <ChevronDown
          className={`mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="border-t border-border px-3.5 py-3 space-y-2.5">
          <blockquote className="border-l-2 border-accent pl-3 font-serif text-[14px] leading-relaxed text-foreground/85 whitespace-pre-wrap">
            {source.content}
          </blockquote>

          {source.id && (
            <div className="pt-1">
              <Link
                href={`/dokumen/${source.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
              >
                <span>Buka dokumen penuh</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
