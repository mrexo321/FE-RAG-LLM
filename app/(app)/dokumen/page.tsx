"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Filter,
  Layers,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Search,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";

import { useCorpus, useCorpusStats } from "@/hooks/use-corpus";
import type { CorpusItem } from "@/types/rag";
import { PdfReader } from "@/components/corpus/pdf-reader";
import { PdfReaderSkeleton } from "@/components/corpus/document-skeleton";
import { Badge } from "@/components/ui/badge";

function DocumentHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // If URL has ?id=xxx, or if user clicked a doc, open the PDF reader
  const paramId = searchParams.get("id");
  const [activeDocId, setActiveDocId] = React.useState<string | null>(paramId);

  // Sync state if URL changes externally
  React.useEffect(() => {
    setActiveDocId(paramId);
  }, [paramId]);

  // Data fetching
  const {
    data: items = [],
    isPending,
    isFetching,
    isError,
    refetch,
  } = useCorpus();
  const { data: stats } = useCorpusStats();

  // Search & Filter state for the Catalog Hub (optimized with useDeferredValue)
  const [searchQuery, setSearchQuery] = React.useState("");
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const isSearching = searchQuery !== deferredSearchQuery;
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [expandedRegs, setExpandedRegs] = React.useState<Record<string, boolean>>({});
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Shortcut key '/' to focus search
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsDropdownOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Pre-indexed search data to avoid repeated expensive .toLowerCase() on massive corpus content
  const searchIndex = React.useMemo(() => {
    return items.map((item) => ({
      item,
      regLower: item.regulation.toLowerCase(),
      titleLower: item.title.toLowerCase(),
      catLower: (item.category || "").toLowerCase(),
      contentLower: item.content.toLowerCase(),
    }));
  }, [items]);

  // Categories list
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort();
  }, [items]);

  // Fast filtered items based on deferred query
  const filteredItems = React.useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    if (!q && selectedCategory === "all") return items;

    let matched = searchIndex;
    if (selectedCategory !== "all") {
      matched = matched.filter((entry) => entry.item.category === selectedCategory);
    }

    if (q) {
      matched = matched.filter((entry) => {
        // Fast checks first: title, regulation, category
        if (
          entry.titleLower.includes(q) ||
          entry.regLower.includes(q) ||
          entry.catLower.includes(q)
        ) {
          return true;
        }
        // Heavy content check only if metadata doesn't match
        return entry.contentLower.includes(q);
      });
    }

    return matched.map((entry) => entry.item);
  }, [searchIndex, items, selectedCategory, deferredSearchQuery]);

  // Group filtered items by Regulation
  const regulationGroups = React.useMemo(() => {
    const groups: Record<string, { regulation: string; category: string; docs: CorpusItem[] }> = {};
    filteredItems.forEach((item) => {
      const reg = item.regulation || "Regulasi Lainnya";
      if (!groups[reg]) {
        groups[reg] = {
          regulation: reg,
          category: item.category || "",
          docs: [],
        };
      }
      groups[reg].docs.push(item);
    });

    return groups;
  }, [filteredItems]);

  // Filtered flat list for the searchable dropdown (capped to max 12 items for instant DOM rendering)
  const filteredDropdownList = React.useMemo(() => {
    return filteredItems.slice(0, 12);
  }, [filteredItems]);

  // Open PDF Reader with selected document
  const handleOpenDoc = (docId: string) => {
    setActiveDocId(docId);
    router.replace(`/dokumen?id=${encodeURIComponent(docId)}`, { scroll: false });
  };

  // Close PDF Reader and return to hub
  const handleCloseDoc = () => {
    setActiveDocId(null);
    router.replace("/dokumen", { scroll: false });
  };

  const toggleExpandReg = (reg: string) => {
    setExpandedRegs((prev) => ({
      ...prev,
      [reg]: !prev[reg],
    }));
  };

  // ── LOADING STATE ──────────────────────────────────────────────────
  if (isPending) {
    return <PdfReaderSkeleton />;
  }

  // ── ERROR STATE ────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-bold text-foreground">
          Gagal Memuat Repositori Dokumen
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Terjadi gangguan saat mengambil data corpus dari backend.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Coba Lagi</span>
          </button>
          <Link
            href="/unggah"
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Unggah Dokumen</span>
          </Link>
        </div>
      </div>
    );
  }

  // ── IF DOCUMENT IS SELECTED: RENDER PDF READER ─────────────────────
  if (activeDocId) {
    return (
      <PdfReader
        items={items}
        initialDocId={activeDocId}
        isFetching={isFetching}
        onRefresh={() => refetch()}
        onClose={handleCloseDoc}
      />
    );
  }

  // ── OTHERWISE: RENDER CLEAN DOKUMEN CATALOG HUB ────────────────────
  const totalRegulations = Object.keys(regulationGroups).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            List Dokumen
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {stats
              ? `${stats.totalDocuments} dokumen di ${stats.totalRegulations} regulasi POJK & SEOJK • Pilih dokumen untuk membuka PDF Reader`
              : "Memuat informasi repositori regulasi..."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Muat ulang dokumen"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
            <span className="hidden sm:inline">Perbarui</span>
          </button>
          <Link
            href="/unggah"
            className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Unggah PDF</span>
          </Link>
        </div>
      </div>

      {/* ── SEARCHABLE COMBOBOX SELECTOR (PREVENTS PILING UP) ───────── */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Pencarian Cepat & Pembaca PDF
            </h2>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Tekan <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]"> / </kbd> untuk mencari
          </span>
        </div>

        {/* Input Combobox */}
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onFocus={() => setIsDropdownOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            placeholder="Ketik untuk mencari regulasi, pasal, atau kata kunci (cth: POJK 12, RBC, Manajemen Risiko)..."
            className="w-full rounded-xl border border-border bg-muted/30 py-3 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          {isSearching ? (
            <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
          ) : (
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          )}
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setIsDropdownOpen(false);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Autocomplete / Search Dropdown Menu */}
          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsDropdownOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute left-0 right-0 top-full mt-2 z-40 max-h-80 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl p-2 divide-y divide-border/40 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground flex justify-between">
                  <span>HASIL PENCARIAN DOKUMEN ({filteredDropdownList.length})</span>
                  <span>Klik untuk membuka di PDF Reader</span>
                </div>

                {filteredDropdownList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Tidak ditemukan dokumen yang cocok dengan kata kunci tersebut.
                  </div>
                ) : (
                  filteredDropdownList.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleOpenDoc(doc.id)}
                      className="group w-full text-left p-2.5 rounded-lg hover:bg-muted/60 transition-colors flex items-start gap-3"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <BookOpen className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-primary truncate">
                            {doc.regulation}
                          </span>
                          {doc.category && (
                            <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground">
                              {doc.category}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {doc.title}
                        </h4>
                        <p className="line-clamp-1 font-serif text-[11px] text-muted-foreground mt-0.5">
                          {doc.content}
                        </p>
                      </div>
                      <span className="shrink-0 self-center text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <span>Buka</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Category Pills Bar */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-medium text-muted-foreground mr-1 shrink-0">
            Kategori:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat === selectedCategory ? "all" : cat)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── REGULATION OVERVIEW CARDS (COMPACT & TIDY) ──────────────── */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Daftar Regulasi ({totalRegulations})
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            Pilih pasal pada dropdown di setiap regulasi untuk membuka PDF Reader
          </span>
        </div>

        {totalRegulations === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-sm font-semibold text-foreground">
              Tidak ada regulasi yang sesuai filter
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Coba bersihkan kata kunci pencarian atau ubah filter kategori.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="mt-4 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(regulationGroups).map(([regName, group]) => {
              const isExpanded = expandedRegs[regName] ?? false;
              const firstDocId = group.docs[0]?.id;

              return (
                <div
                  key={regName}
                  className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Regulation Name & Category Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-bold text-primary block truncate">
                          {regName}
                        </span>
                        {group.category && (
                          <span className="mt-1 inline-block rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {group.category}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                        {group.docs.length} Pasal/Bagian
                      </span>
                    </div>

                    {/* Dropdown Select for Specific Pasal / Article */}
                    <div className="mt-4">
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                        Pilih pasal/bagian regulasi:
                      </label>
                      <select
                        onChange={(e) => {
                          if (e.target.value) handleOpenDoc(e.target.value);
                        }}
                        defaultValue=""
                        className="w-full h-9 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="" disabled>
                          -- Pilih pasal untuk membaca di PDF Reader --
                        </option>
                        {group.docs.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Expandable Article Outline */}
                    {isExpanded && (
                      <div className="mt-3 max-h-48 overflow-y-auto space-y-1.5 pr-1 border-t border-border/60 pt-3">
                        {group.docs.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => handleOpenDoc(d.id)}
                            className="w-full text-left rounded-lg p-2 text-xs hover:bg-muted/70 transition-colors flex items-center justify-between group"
                          >
                            <span className="line-clamp-1 text-foreground group-hover:text-primary font-medium">
                              {d.title}
                            </span>
                            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleExpandReg(regName)}
                      className="text-[11px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1"
                    >
                      <span>{isExpanded ? "Sembunyikan daftar pasal" : `Lihat semua ${group.docs.length} pasal`}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {firstDocId && (
                      <button
                        type="button"
                        onClick={() => handleOpenDoc(firstDocId)}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-all"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Buka PDF Reader</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocumentHubPage() {
  return (
    <React.Suspense fallback={<PdfReaderSkeleton />}>
      <DocumentHubContent />
    </React.Suspense>
  );
}
