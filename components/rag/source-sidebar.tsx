"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  ExternalLink,
  MessagesSquare,
  PanelRightClose,
  X,
} from "lucide-react";
import type { SourceDocument } from "@/types/rag";
import { useChat } from "@/components/chat/chat-provider";

export function SourceSidebar() {
  const {
    sidebarSources,
    activeCiteIndex,
    isSidebarOpen,
    closeSidebar,
    clearActiveCite,
  } = useChat();

  const [openCards, setOpenCards] = React.useState<Set<number>>(new Set());
  const [flashingIndex, setFlashingIndex] = React.useState<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);



  // Saat activeCiteIndex berubah, scroll ke kartu yang sesuai dan beri sorotan
  React.useEffect(() => {
    if (activeCiteIndex !== null && activeCiteIndex >= 0) {
      setOpenCards((prev) => new Set(prev).add(activeCiteIndex));
      setFlashingIndex(activeCiteIndex);

      setTimeout(() => {
        const el = document.getElementById(`sidebar-source-${activeCiteIndex}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 80);

      const timer = setTimeout(() => {
        setFlashingIndex(null);
        clearActiveCite();
      }, 1800);

      return () => clearTimeout(timer);
    }
  }, [activeCiteIndex, clearActiveCite]);

  // Reset openCards saat sidebarSources berubah (pesan baru)
  React.useEffect(() => {
    setOpenCards(new Set());
  }, [sidebarSources?.messageId]);

  if (!sidebarSources || sidebarSources.sources.length === 0) return null;

  function toggleCard(idx: number) {
    setOpenCards((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  const sources = sidebarSources.sources;

  return (
    <>
      {/* Overlay mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        ref={containerRef}
        className={`
          fixed right-0 top-0 z-40 flex h-full flex-col
          border-l border-border bg-card shadow-2xl
          transition-all duration-300 ease-out
          w-full sm:w-96
          lg:relative lg:z-auto lg:shadow-none lg:h-auto lg:top-auto
          lg:w-[420px] lg:shrink-0
          ${isSidebarOpen
            ? "translate-x-0 lg:translate-x-0 lg:ml-0"
            : "translate-x-full lg:hidden"
          }
        `}
        aria-label="Panel sumber rujukan"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15">
              <BookOpen className="h-3.5 w-3.5 text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Sumber Rujukan
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {sources.length} dokumen ditemukan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Tutup panel sumber"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Source list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
          {sources.map((source, idx) => {
            const isHighlighted = flashingIndex === idx;
            const isExpanded = openCards.has(idx);
            return (
              <SidebarSourceCard
                key={idx}
                source={source}
                index={idx}
                isHighlighted={isHighlighted}
                expanded={isExpanded}
                onToggle={() => toggleCard(idx)}
              />
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border px-4 py-2.5">
          <p className="text-center text-[11px] text-muted-foreground">
            Klik nomor sitasi <span className="font-semibold text-accent">[n]</span>{" "}
            pada jawaban untuk menyorot sumber
          </p>
        </div>
      </aside>
    </>
  );
}

/**
 * Tombol kecil yang ditampilkan di chat area untuk membuka sidebar
 */
export function SourceSidebarToggle() {
  const { sidebarSources, isSidebarOpen, toggleSidebar } = useChat();
  const { messages, clearChat } = useChat();

  if (!sidebarSources || sidebarSources.sources.length === 0 && messages.length === 0) return null;
  if (isSidebarOpen) return null; // Sembunyikan tombol saat sidebar terbuka

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className="
        fixed right-4 top-1/2 z-20 -translate-y-1/2
        flex items-center gap-2 rounded-xl
        border border-border bg-card/95 px-3 py-2.5
        text-xs font-semibold text-foreground
        shadow-lg backdrop-blur-md
        transition-all duration-200
        hover:bg-muted hover:shadow-xl
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
        lg:right-2
      "
      aria-label="Buka panel sumber rujukan"
    >
      <PanelRightClose className="h-4 w-4 text-accent" />
      <span className={`hidden sm:inline`}>
        {sidebarSources.sources.length} Sumber
      </span>
    </button>
  );
}

// ── Source Card ──────────────────────────────────────────────────────

function SidebarSourceCard({
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
    <div
      id={`sidebar-source-${index}`}
      className={`
        overflow-hidden rounded-xl border transition-all duration-300
        ${
          isHighlighted
            ? "border-accent bg-accent/10 ring-2 ring-accent/50 shadow-md"
            : "border-border bg-[hsl(var(--source-card-bg))] hover:border-border/80"
        }
      `}
    >
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold transition-colors ${
            isHighlighted
              ? "bg-accent text-accent-foreground shadow-sm"
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
          {(source.category || relevance !== null) && (
            <span className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
              {source.category && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium">
                  {source.category}
                </span>
              )}
              {/* {relevance !== null && (
                <span className="flex items-center gap-1.5" title="Tingkat kemiripan">
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-[hsl(var(--success))]"
                      style={{ width: `${relevance}%` }}
                    />
                  </span>
                  <span className="font-mono">{relevance}%</span>
                </span>
              )} */}
            </span>
          )}
        </span>
        <ChevronRight
          className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            expanded ? "rotate-90" : ""
          }`}
          aria-hidden
        />
      </button>

      {/* Konten dokumen yang diperluas */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-3.5 py-3 space-y-2.5">
            <blockquote className="border-l-2 border-accent pl-3 font-serif text-[13px] leading-relaxed text-foreground/85 whitespace-pre-wrap max-h-64 overflow-y-auto">
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
        </div>
      </div>
    </div>
  );
}
