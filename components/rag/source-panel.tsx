"use client";

import * as React from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import type { SourceDocument } from "@/types/rag";

interface SourcePanelProps {
  sources: SourceDocument[];
  /** dipertahankan agar kompatibel dengan pemanggil lama */
  staggered?: boolean;
}

export function SourcePanel({ sources }: SourcePanelProps) {
  const [open, setOpen] = React.useState(true);
  const [openCards, setOpenCards] = React.useState<Set<number>>(new Set());

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
        <ChevronDown className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <ul className="space-y-2">
          {sources.map((s, idx) => (
            <li
              key={idx}
              className="animate-slide-up overflow-hidden rounded-xl border border-border bg-[hsl(var(--source-card-bg))]"
              style={{ animationDelay: `${idx * 60}ms`, opacity: 0 }}
            >
              <SourceCard
                source={s}
                index={idx}
                expanded={openCards.has(idx)}
                onToggle={() => toggleCard(idx)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SourceCard({
  source,
  index,
  expanded,
  onToggle,
}: {
  source: SourceDocument;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  // Skor kemiripan ditampilkan hanya jika berskala 0–1.
  const relevance =
    typeof source.score === "number" && source.score > 0 && source.score <= 1
      ? Math.round(source.score * 100)
      : null;

  return (
    <>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/15 text-[11px] font-semibold text-[hsl(var(--accent))]">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold leading-snug text-foreground">{source.regulation}</span>
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{source.title}</span>
          {(source.category || relevance !== null) && (
            <span className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
              {source.category && <span>{source.category}</span>}
              {relevance !== null && (
                <span className="flex items-center gap-1.5" title="Tingkat kemiripan dengan pertanyaan">
                  <span className="h-1 w-14 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-[hsl(var(--success))]" style={{ width: `${relevance}%` }} />
                  </span>
                  {relevance}%
                </span>
              )}
            </span>
          )}
        </span>
        <ChevronDown className={`mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {expanded && (
        <div className="border-t border-border px-3.5 py-3">
          <blockquote className="border-l-2 border-accent pl-3 font-serif text-[14px] leading-relaxed text-foreground/85 whitespace-pre-wrap">
            {source.content}
          </blockquote>
        </div>
      )}
    </>
  );
}
