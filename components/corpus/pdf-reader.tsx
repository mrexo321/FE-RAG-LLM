"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Highlighter,
  Maximize2,
  MessageSquareText,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Printer,
  Search,
  Type,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
  Trash2,
} from "lucide-react";

import type { CorpusItem } from "@/types/rag";
import { useToast } from "@/components/toast-provider";
import { Badge } from "@/components/ui/badge";

interface PdfReaderProps {
  items: CorpusItem[];
  initialDocId?: string;
  isFetching?: boolean;
  onRefresh?: () => void;
  onClose?: () => void;
}

type FontSize = "sm" | "base" | "lg" | "xl";
type FontFamily = "serif" | "sans";
type PaperWidth = "standard" | "wide";

interface Highlight {
  id: string;
  docId: string;
  text: string;
  color: "yellow" | "green" | "blue" | "pink";
}

export function PdfReader({
  items,
  initialDocId,
  isFetching = false,
  onRefresh,
  onClose,
}: PdfReaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Active document ID
  const [selectedId, setSelectedId] = React.useState<string>(() => {
    if (initialDocId && items.some((i) => i.id === initialDocId)) {
      return initialDocId;
    }
    const paramId = searchParams.get("id");
    if (paramId && items.some((i) => i.id === paramId)) {
      return paramId;
    }
    return items[0]?.id ?? "";
  });

  // Keep selectedId in sync if initialDocId changes
  React.useEffect(() => {
    if (initialDocId && items.some((i) => i.id === initialDocId)) {
      setSelectedId(initialDocId);
    }
  }, [initialDocId, items]);

  // Reader customization state
  const [fontSize, setFontSize] = React.useState<FontSize>("base");
  const [fontFamily, setFontFamily] = React.useState<FontFamily>("serif");
  const [paperWidth, setPaperWidth] = React.useState<PaperWidth>("standard");
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Sidebar search query
  const [sidebarSearch, setSidebarSearch] = React.useState("");

  // Search & Filter state for the searchable combobox / dropdown
  const [dropdownSearch, setDropdownSearch] = React.useState("");
  const deferredDropdownSearch = React.useDeferredValue(dropdownSearch);
  const [dropdownCategory, setDropdownCategory] = React.useState("all");
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const paperTopRef = React.useRef<HTMLDivElement>(null);

  // Markdown / Highlight State
  const [highlights, setHighlights] = React.useState<Highlight[]>([]);
  const [selectedText, setSelectedText] = React.useState("");
  const [selectionPopoverPos, setSelectionPopoverPos] = React.useState<{ top: number; left: number } | null>(null);

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (isSelectOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  }, [isSelectOpen]);

  // Handle Text Selection for Markdown Tool
  const handleTextSelection = React.useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionPopoverPos(null);
      setSelectedText("");
      return;
    }

    const text = selection.toString().trim();
    if (text.length > 2) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(text);
      setSelectionPopoverPos({
        top: rect.top + window.scrollY - 45,
        left: rect.left + rect.width / 2,
      });
    } else {
      setSelectionPopoverPos(null);
      setSelectedText("");
    }
  }, []);

  const addHighlight = (color: Highlight["color"]) => {
    if (!selectedText || !selectedId) return;
    const newHighlight: Highlight = {
      id: Date.now().toString(),
      docId: selectedId,
      text: selectedText,
      color,
    };
    setHighlights((prev) => [...prev, newHighlight]);
    setSelectionPopoverPos(null);
    setSelectedText("");
    window.getSelection()?.removeAllRanges();
    toast("Teks berhasil markdown", "success");
  };

  const removeHighlight = (id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    toast("Markdown dihapus", "info");
  };

  // Pre-indexed search data
  const searchIndex = React.useMemo(() => {
    return items.map((item) => ({
      item,
      regLower: item.regulation.toLowerCase(),
      titleLower: item.title.toLowerCase(),
      catLower: (item.category || "").toLowerCase(),
      contentLower: item.content.toLowerCase(),
    }));
  }, [items]);

  // Current document
  const currentDoc = React.useMemo(() => {
    return items.find((d) => d.id === selectedId) || items[0] || null;
  }, [items, selectedId]);

  // Index of current document
  const currentIndex = React.useMemo(() => {
    if (!currentDoc) return -1;
    return items.findIndex((d) => d.id === currentDoc.id);
  }, [items, currentDoc]);

  const prevDoc = currentIndex > 0 ? items[currentIndex - 1] : null;
  const nextDoc = currentIndex >= 0 && currentIndex < items.length - 1 ? items[currentIndex + 1] : null;

  // Filtered sidebar items
  const sidebarFilteredItems = React.useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.regulation.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q)
    );
  }, [items, sidebarSearch]);

  // Categories list
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtered documents for searchable select
  const filteredDropdownItems = React.useMemo(() => {
    const q = deferredDropdownSearch.trim().toLowerCase();
    let matched = searchIndex;

    if (dropdownCategory !== "all") {
      matched = matched.filter((entry) => entry.item.category === dropdownCategory);
    }

    if (q) {
      matched = matched.filter((entry) => {
        if (
          entry.titleLower.includes(q) ||
          entry.regLower.includes(q) ||
          entry.catLower.includes(q)
        ) {
          return true;
        }
        return entry.contentLower.includes(q);
      });
    }

    return matched.slice(0, 25).map((entry) => entry.item);
  }, [searchIndex, dropdownCategory, deferredDropdownSearch]);

  // Group filtered documents by regulation
  const groupedDropdownItems = React.useMemo(() => {
    const groups: Record<string, CorpusItem[]> = {};
    filteredDropdownItems.forEach((item) => {
      const reg = item.regulation || "Regulasi Lainnya";
      if (!groups[reg]) groups[reg] = [];
      groups[reg].push(item);
    });
    return groups;
  }, [filteredDropdownItems]);

  // Switch to a new document
  const handleSelectDoc = React.useCallback(
    (id: string) => {
      setSelectedId(id);
      setIsSelectOpen(false);
      const params = new URLSearchParams(window.location.search);
      params.set("id", id);
      window.history.replaceState(null, "", `?${params.toString()}`);
      paperTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    []
  );

  // Keyboard shortcuts
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        if (e.key === "Escape") setIsSelectOpen(false);
        return;
      }

      if (e.key === "ArrowLeft" && prevDoc) {
        handleSelectDoc(prevDoc.id);
      } else if (e.key === "ArrowRight" && nextDoc) {
        handleSelectDoc(nextDoc.id);
      } else if (e.key === "/" || (e.ctrlKey && e.key === "k")) {
        e.preventDefault();
        setIsSelectOpen(true);
      } else if (e.key === "Escape") {
        setIsSelectOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevDoc, nextDoc, handleSelectDoc]);

  // Copy full content
  const handleCopy = async () => {
    if (!currentDoc) return;
    try {
      await navigator.clipboard.writeText(
        `${currentDoc.regulation}\n${currentDoc.title}\nKategori: ${currentDoc.category}\n\n${currentDoc.content}`
      );
      setCopied(true);
      toast("Isi dokumen disalin ke clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Gagal menyalin isi dokumen", "error");
    }
  };

  // Ask AI about this document
  const handleAskAi = () => {
    if (!currentDoc) return;
    const prompt = `Jelaskan mengenai ${currentDoc.title} pada ${currentDoc.regulation}`;
    router.push(`/?q=${encodeURIComponent(prompt)}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const fontSizeClasses: Record<FontSize, string> = {
    sm: "text-xs sm:text-sm leading-relaxed",
    base: "text-sm sm:text-base leading-relaxed sm:leading-loose",
    lg: "text-base sm:text-lg leading-loose",
    xl: "text-lg sm:text-xl leading-loose",
  };

  const readingTimeMinutes = React.useMemo(() => {
    if (!currentDoc) return 1;
    const words = currentDoc.content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 180));
  }, [currentDoc]);

  // Markdown Parser & Markdown Highlighting Engine
 // ── REVISED MARKDOWN & STABILO HIGHLIGHTING ENGINE ──────────────────────
  const renderMarkdownAndHighlights = (
    text: string,
    query: string,
    docHighlights: Highlight[]
  ) => {
    if (!text) return null;

    // 1. Ekstrak teks stabilo yang unik untuk dicocokkan
    const highlightTexts = Array.from(new Set(docHighlights.map((h) => h.text)))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length); // Urutkan dari yang terpanjang

    // Escape regex khusus untuk teks stabilo
    const escapedHighlights = highlightTexts.map((t) =>
      t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );

    // Escape regex untuk pencarian (query)
    const q = query.trim();
    const escapedQuery = q && q.length >= 2 ? q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : null;

    // 2. Buat Pattern Regex Gabungan: Markdown + Stabilo + Search Query
    const patterns: string[] = [
      "(\\*\\*.*?\\*\\*)", // Bold **text**
      "(\\*.*?\\*)",        // Italic *text*
      "(`.*?`)",           // Code `text`
    ];

    if (escapedHighlights.length > 0) {
      patterns.push(`(${escapedHighlights.join("|")})`);
    }
    if (escapedQuery) {
      patterns.push(`(${escapedQuery})`);
    }

    const masterRegex = new RegExp(patterns.join("|"), "gi");

    // Helper untuk merender token individual
    const processToken = (token: string, key: string | number) => {
      // a. Cek apakah ini Bold
      if (token.startsWith("**") && token.endsWith("**")) {
        return (
          <strong key={key} className="font-bold text-foreground">
            {token.slice(2, -2)}
          </strong>
        );
      }
      // b. Cek apakah ini Italic
      if (token.startsWith("*") && token.endsWith("*")) {
        return (
          <em key={key} className="italic">
            {token.slice(1, -1)}
          </em>
        );
      }
      // c. Cek apakah ini Code
      if (token.startsWith("`") && token.endsWith("`")) {
        return (
          <code
            key={key}
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-primary"
          >
            {token.slice(1, -1)}
          </code>
        );
      }

      // d. Cek apakah ini Teks Stabilo (Bisa diganti warna & di-unmarkdown/diklik hapus)
      const matchedHighlight = docHighlights.find(
        (h) => h.text.toLowerCase() === token.toLowerCase()
      );

      if (matchedHighlight) {
        const colorClass =
          matchedHighlight.color === "yellow"
            ? "bg-amber-300/70 hover:bg-amber-400/80 dark:bg-amber-500/50"
            : matchedHighlight.color === "green"
            ? "bg-emerald-300/70 hover:bg-emerald-400/80 dark:bg-emerald-500/50"
            : matchedHighlight.color === "blue"
            ? "bg-sky-300/70 hover:bg-sky-400/80 dark:bg-sky-500/50"
            : "bg-pink-300/70 hover:bg-pink-400/80 dark:bg-pink-500/50";

        return (
          <mark
            key={key}
            onClick={(e) => {
              e.stopPropagation();
              // KLIK UNTUK UNMARKDOWN (HAPUS STABILO)
              removeHighlight(matchedHighlight.id);
            }}
            className={`group relative inline-block cursor-pointer rounded px-1 py-0.5 text-foreground transition-all ${colorClass}`}
            title="Klik untuk menghapus/unmarkdown stabilo ini"
          >
            {token}
            {/* Tooltip Unmark saat di-hover */}
            <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-1.5 py-0.5 text-[10px] font-medium text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
              Hapus Markdown
            </span>
          </mark>
        );
      }

      // e. Cek apakah ini Search Query Highlight
      if (escapedQuery && token.toLowerCase() === q.toLowerCase()) {
        return (
          <mark
            key={key}
            className="rounded bg-amber-400/50 px-1 py-0.5 font-medium text-foreground"
          >
            {token}
          </mark>
        );
      }

      return token;
    };

    // 3. Render per baris dokumen
    const lines = text.split("\n");

    return lines.map((line, lineIdx) => {
      const trimmed = line.trim();

      // Render Header Markdown
      if (trimmed.startsWith("### ")) {
        const parts = trimmed.slice(4).split(masterRegex).filter(Boolean);
        return (
          <h3 key={lineIdx} className="mt-4 mb-2 text-base sm:text-lg font-bold text-foreground">
            {parts.map((part, i) => processToken(part, i))}
          </h3>
        );
      }
      if (trimmed.startsWith("## ")) {
        const parts = trimmed.slice(3).split(masterRegex).filter(Boolean);
        return (
          <h2 key={lineIdx} className="mt-6 mb-3 text-lg sm:text-xl font-bold text-foreground border-b border-border/40 pb-1">
            {parts.map((part, i) => processToken(part, i))}
          </h2>
        );
      }
      if (trimmed.startsWith("# ")) {
        const parts = trimmed.slice(2).split(masterRegex).filter(Boolean);
        return (
          <h1 key={lineIdx} className="mt-8 mb-4 text-xl sm:text-2xl font-extrabold text-foreground">
            {parts.map((part, i) => processToken(part, i))}
          </h1>
        );
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const parts = trimmed.slice(2).split(masterRegex).filter(Boolean);
        return (
          <li key={lineIdx} className="ml-4 list-disc my-1">
            {parts.map((part, i) => processToken(part, i))}
          </li>
        );
      }

      // Render Paragraf Biasa
      const parts = line.split(masterRegex).filter(Boolean);
      return (
        <p key={lineIdx} className="min-h-[1em] my-1.5">
          {parts.map((part, i) => processToken(part, i))}
        </p>
      );
    });
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground shadow-inner">
          <BookOpen className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-foreground">Belum Ada Dokumen Regulasi</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
          Repositori regulasi POJK masih kosong. Anda dapat mengunggah file PDF regulasi untuk diindeks ke sistem.
        </p>
        <Link
          href="/unggah"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-md hover:opacity-90 transition-all"
        >
          <UploadCloud className="h-4 w-4" />
          <span>Unggah Berkas PDF</span>
        </Link>
      </div>
    );
  }

  const activeDocHighlights = highlights.filter((h) => h.docId === selectedId);

  return (
    <div className="relative h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-muted/30">
      <div ref={paperTopRef} />

      {/* ── Markdown FLOATING TOOLBAR ─────────────────────────────────────── */}
      {selectionPopoverPos && (
        <div
          style={{ top: `${selectionPopoverPos.top}px`, left: `${selectionPopoverPos.left}px` }}
          className="fixed z-50 -translate-x-1/2 flex items-center gap-1.5 rounded-xl border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        >
          <span className="text-[10px] font-semibold text-muted-foreground px-1.5 border-r border-border">
            Markdown:
          </span>
          <button
            type="button"
            onClick={() => addHighlight("yellow")}
            className="h-5 w-5 rounded-full bg-amber-300 border border-amber-400 hover:scale-110 transition-transform"
            title="Markdown Kuning"
          />
          <button
            type="button"
            onClick={() => addHighlight("green")}
            className="h-5 w-5 rounded-full bg-emerald-300 border border-emerald-400 hover:scale-110 transition-transform"
            title="Markdown Hijau"
          />
          <button
            type="button"
            onClick={() => addHighlight("blue")}
            className="h-5 w-5 rounded-full bg-sky-300 border border-sky-400 hover:scale-110 transition-transform"
            title="Markdown Biru"
          />
          <button
            type="button"
            onClick={() => addHighlight("pink")}
            className="h-5 w-5 rounded-full bg-pink-300 border border-pink-400 hover:scale-110 transition-transform"
            title="Markdown Merah Muda"
          />
        </div>
      )}

      {/* ── CLEAN & BALANCED HEADER TOOLBAR ─────────────────────────────── */}
      <header className="no-print shrink-0 border-b border-border/80 bg-card/95 backdrop-blur-md px-3 sm:px-6 py-2 shadow-xs z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          {/* Left Group: Navigation & Document Selector */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                title="Kembali"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Daftar</span>
              </button>
            ) : (
              <Link
                href="/dokumen"
                className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                title="Kembali"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Daftar</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border shrink-0 transition-colors ${
                isSidebarOpen
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              title={isSidebarOpen ? "Tutup Sidebar" : "Buka Sidebar"}
            >
              {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>

            {/* Document Select Button */}
            <button
              type="button"
              onClick={() => setIsSelectOpen(true)}
              className="group flex h-9 max-w-md flex-1 items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 text-left text-xs shadow-xs transition-all hover:border-primary/50 hover:bg-muted/30 focus:outline-none"
              title="Cari atau pilih dokumen"
            >
              <div className="flex items-center gap-2 truncate">
                <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground truncate max-w-[120px] sm:max-w-[180px]">
                  {currentDoc?.regulation ?? "Pilih Dokumen"}
                </span>
                <span className="text-muted-foreground truncate hidden md:inline">
                  • {currentDoc?.title}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
            </button>
          </div>

          {/* Center Group: Page / Document Pagination */}
          <div className="hidden lg:flex items-center gap-1 shrink-0 border-x border-border/60 px-3">
            <button
              type="button"
              disabled={!prevDoc}
              onClick={() => prevDoc && handleSelectDoc(prevDoc.id)}
              className="flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              title="Dokumen Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-2 text-xs font-medium text-muted-foreground whitespace-nowrap">
              <span className="font-semibold text-foreground">
                {currentIndex >= 0 ? currentIndex + 1 : 1}
              </span>{" "}
              / {items.length}
            </span>

            <button
              type="button"
              disabled={!nextDoc}
              onClick={() => nextDoc && handleSelectDoc(nextDoc.id)}
              className="flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              title="Dokumen Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Right Group: Reader Customizations & Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Font Family Switch */}
            <button
              type="button"
              onClick={() => setFontFamily((f) => (f === "serif" ? "sans" : "serif"))}
              className="flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              title="Ubah jenis font"
            >
              <Type className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden xl:inline">{fontFamily === "serif" ? "Serif" : "Sans"}</span>
            </button>

            {/* Font Zoom Controls */}
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
              <button
                type="button"
                onClick={() => {
                  if (fontSize === "xl") setFontSize("lg");
                  else if (fontSize === "lg") setFontSize("base");
                  else if (fontSize === "base") setFontSize("sm");
                }}
                disabled={fontSize === "sm"}
                className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-40"
                title="Perkecil Teks"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setFontSize("base")}
                className="px-1.5 text-[11px] font-mono font-medium text-muted-foreground hover:text-foreground"
                title="Reset Ukuran"
              >
                {fontSize === "sm" ? "85%" : fontSize === "base" ? "100%" : fontSize === "lg" ? "115%" : "130%"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (fontSize === "sm") setFontSize("base");
                  else if (fontSize === "base") setFontSize("lg");
                  else if (fontSize === "lg") setFontSize("xl");
                }}
                disabled={fontSize === "xl"}
                className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-40"
                title="Perbesar Teks"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Paper Width Toggle */}
            <button
              type="button"
              onClick={() => setPaperWidth((w) => (w === "standard" ? "wide" : "standard"))}
              className={`hidden sm:flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-medium transition-colors ${
                paperWidth === "wide"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              title="Ganti Lebar Kertas"
            >
              {paperWidth === "wide" ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              title="Salin isi dokumen"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className="hidden xl:inline">{copied ? "Tersalin" : "Salin"}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              title="Cetak Dokumen"
            >
              <Printer className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden xl:inline">Cetak</span>
            </button>

            {/* Ask AI Button */}
            <button
              type="button"
              onClick={handleAskAi}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:opacity-90"
              title="Tanyakan ke AI"
            >
              <MessageSquareText className="h-3.5 w-3.5" />
              <span>Tanya AI</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── SEARCHABLE COMBOBOX MODAL ─────────────────────────────────────── */}
      {isSelectOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 sm:pt-20 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsSelectOpen(false)} aria-hidden="true" />

          <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            <div className="border-b border-border p-3 sm:p-4">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={dropdownSearch}
                  onChange={(e) => setDropdownSearch(e.target.value)}
                  placeholder="Ketik regulasi, nomor pasal, atau kata kunci..."
                  className="w-full rounded-xl border border-border bg-muted/40 py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none"
                />
                {dropdownSearch && (
                  <button
                    type="button"
                    onClick={() => setDropdownSearch("")}
                    className="absolute right-3 rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setDropdownCategory("all")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                    dropdownCategory === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  Semua ({items.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setDropdownCategory(cat === dropdownCategory ? "all" : cat)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                      dropdownCategory === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 divide-y divide-border/40">
              {filteredDropdownItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Tidak ada dokumen yang cocok.</div>
              ) : (
                Object.entries(groupedDropdownItems).map(([reg, docs]) => (
                  <div key={reg} className="py-2.5 first:pt-1 last:pb-1">
                    <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xs px-2 py-1 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider">{reg}</span>
                      <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground font-mono">
                        {docs.length} bagian
                      </span>
                    </div>

                    <div className="mt-1 space-y-1">
                      {docs.map((doc) => {
                        const isSelected = doc.id === selectedId;
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => handleSelectDoc(doc.id)}
                            className={`group w-full text-left rounded-xl p-2.5 transition-all flex items-start gap-3 ${
                              isSelected
                                ? "bg-primary/10 border border-primary/30"
                                : "hover:bg-muted/60 border border-transparent"
                            }`}
                          >
                            <FileText className={`h-4 w-4 mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-xs font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                                {doc.title}
                              </h4>
                              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{doc.content}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border bg-card p-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSelectOpen(false)}
                className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WORKSPACE (SIDEBAR + MAIN CANVAS) ─────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* ── Collapsible Document Outline Sidebar with Search ────────────── */}
        {isSidebarOpen && (
          <aside className="no-print w-72 sm:w-80 border-r border-border bg-card shrink-0 flex flex-col h-full overflow-hidden shadow-md animate-in slide-in-from-left duration-200">
            {/* Sidebar Title & Close */}
            <div className="shrink-0 p-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-semibold text-foreground">Daftar Regulasi</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Tutup Sidebar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Interactive Sidebar Search Input */}
            <div className="p-2 border-b border-border/60 bg-muted/20">
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Filter dokumen..."
                  className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                {sidebarSearch && (
                  <button
                    type="button"
                    onClick={() => setSidebarSearch("")}
                    className="absolute right-2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Sidebar Scrollable List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              {Object.entries(
                sidebarFilteredItems.reduce((acc, doc) => {
                  const reg = doc.regulation || "Regulasi Lainnya";
                  if (!acc[reg]) acc[reg] = [];
                  acc[reg].push(doc);
                  return acc;
                }, {} as Record<string, CorpusItem[]>)
              ).map(([reg, docs]) => (
                <div key={reg} className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    {reg} ({docs.length})
                  </div>
                  {docs.map((doc) => {
                    const active = doc.id === selectedId;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => handleSelectDoc(doc.id)}
                        className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition-colors flex items-center justify-between gap-2 ${
                          active
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="truncate">{doc.title}</span>
                        {active && <Check className="h-3 w-3 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Markdown List Widget in Sidebar */}
            {activeDocHighlights.length > 0 && (
              <div className="shrink-0 border-t border-border p-2 bg-muted/30">
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Highlighter className="h-3 w-3" /> Markdown Disimpan ({activeDocHighlights.length})
                  </span>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {activeDocHighlights.map((hl) => (
                    <div
                      key={hl.id}
                      className="group flex items-center justify-between rounded p-1.5 text-[11px] bg-background border border-border/60"
                    >
                      <span className="line-clamp-1 italic text-muted-foreground">"{hl.text}"</span>
                      <button
                        type="button"
                        onClick={() => removeHighlight(hl.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* ── MAIN PDF PAPER VIEWER ───────────────────────────────────── */}
        <main
          onMouseUp={handleTextSelection}
          className="flex-1 h-full min-h-0 overflow-y-auto px-3 sm:px-8 py-6 sm:py-10 flex flex-col items-center"
        >
          {currentDoc ? (
            <article
              id="pdf-document-sheet"
              className={`pdf-sheet w-full transition-all duration-200 ${
                paperWidth === "wide" ? "max-w-5xl" : "max-w-3xl"
              } rounded-2xl border border-border bg-card p-6 sm:p-12 shadow-xl ring-1 ring-border/50`}
            >
              {/* Document Header Kop */}
              <div className="border-b-2 border-foreground/80 pb-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                    <BookOpen className="h-4 w-4" />
                  </div>

                </div>
                <p className="text-[10px] tracking-wider text-muted-foreground uppercase font-semibold">
                  SALINAN RESMI REGULASI DAN KETENTUAN PERASURANSIAN
                </p>
                <div className="mt-3 flex flex-col gap-0.5">
                  <div className="h-[2px] w-full bg-foreground/90" />
                  <div className="h-[0.5px] w-full bg-foreground/60" />
                </div>
              </div>

              {/* Regulation Metadata Row */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2.5 py-1 font-mono text-xs font-bold text-primary">
                    {currentDoc.regulation}
                  </span>
                  {currentDoc.category && <Badge variant="outline" className="text-xs">{currentDoc.category}</Badge>}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                  <span>ID: #{currentDoc.id}</span>
                  <span>•</span>
                  <span>Waktu Baca: ~{readingTimeMinutes} mnt</span>
                </div>
              </div>

              {/* Title */}
              <div className="mt-6 border-b border-border/60 pb-5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
                  {currentDoc.title}
                </h1>
              </div>

              {/* Full Body Text with Markdown & Markdown Rendering */}
              <div className="mt-8">
                <div
                  className={`${fontFamily === "serif" ? "font-serif" : "font-sans"} ${
                    fontSizeClasses[fontSize]
                  } text-foreground/90 whitespace-pre-line tracking-normal`}
                >
                  {renderMarkdownAndHighlights(currentDoc.content, deferredDropdownSearch, activeDocHighlights)}
                </div>
              </div>

              {/* Bottom Navigation Jumpers */}
              <div className="no-print mt-12 pt-4 border-t border-dashed border-border/80 flex items-center justify-between gap-4">
                {prevDoc ? (
                  <button
                    type="button"
                    onClick={() => handleSelectDoc(prevDoc.id)}
                    className="group flex items-center gap-2 text-left text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    <div>
                      <span className="block text-[10px] uppercase font-semibold">Sebelumnya</span>
                      <span className="line-clamp-1 max-w-[180px] text-foreground font-medium">{prevDoc.title}</span>
                    </div>
                  </button>
                ) : (
                  <div />
                )}

                <div className="text-[11px] font-mono">
                  {currentIndex >= 0 ? currentIndex + 1 : 1} / {items.length}
                </div>

                {nextDoc ? (
                  <button
                    type="button"
                    onClick={() => handleSelectDoc(nextDoc.id)}
                    className="group flex items-center gap-2 text-right text-xs text-muted-foreground hover:text-foreground"
                  >
                    <div>
                      <span className="block text-[10px] uppercase font-semibold">Berikutnya</span>
                      <span className="line-clamp-1 max-w-[180px] text-foreground font-medium">{nextDoc.title}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                ) : (
                  <div />
                )}
              </div>
            </article>
          ) : (
            <div className="py-20 text-center text-sm text-muted-foreground">Dokumen tidak ditemukan.</div>
          )}
        </main>
      </div>
    </div>
  );
}
