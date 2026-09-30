"use client";

import * as React from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileText,
  FileUp,
  Library,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Search,
  SearchX,
  UploadCloud,
  X,
} from "lucide-react";

import { useCorpus, useUploadPdf } from "@/hooks/use-corpus";
import type { CorpusItem } from "@/types/rag";

const MAX_MB = 20; // batas sisi klien, sesuaikan dengan batas di backend
const PAGE_SIZE = 50;

type Tab = "corpus" | "upload";

interface KnowledgePanelProps {
  open: boolean;
  onClose: () => void;
  /** Dipanggil saat pengguna klik "Tanyakan ini" pada sebuah dokumen. */
  onAsk: (question: string) => void;
}

export function KnowledgePanel({ open, onClose, onAsk }: KnowledgePanelProps) {
  const [tab, setTab] = React.useState<Tab>("corpus");

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Kamus Data"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "invisible translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Library className="h-4 w-4" aria-hidden />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Kamus Data</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup panel"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-border px-4 pt-2" role="tablist">
          <TabButton active={tab === "corpus"} onClick={() => setTab("corpus")}>
            Daftar dokumen
          </TabButton>
          <TabButton active={tab === "upload"} onClick={() => setTab("upload")}>
            Unggah PDF
          </TabButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "corpus" ? (
            <CorpusTab
              enabled={open}
              onAsk={(q) => {
                onClose();
                onAsk(q);
              }}
            />
          ) : (
            <UploadTab />
          )}
        </div>
      </aside>
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ── Tab: daftar corpus ────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-accent/30 px-0.5 text-inherit">
            {p}
          </mark>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        )
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-3 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function CorpusTab({ enabled, onAsk }: { enabled: boolean; onAsk: (q: string) => void }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useCorpus(enabled);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<string | null>(null);
  const [limit, setLimit] = React.useState(PAGE_SIZE);
  const [openId, setOpenId] = React.useState<string | null>(null);

  const items = React.useMemo(() => data ?? [], [data]);

  const categories = React.useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((d) => {
      if (d.category) counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const regulationCount = React.useMemo(
    () => new Set(items.map((d) => d.regulation)).size,
    [items]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (d) =>
        (!category || d.category === category) &&
        (!q ||
          d.regulation.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          d.content.toLowerCase().includes(q))
    );
  }, [items, query, category]);

  React.useEffect(() => setLimit(PAGE_SIZE), [query, category]);

  // Kelompokkan per regulasi, urutan kemunculan dipertahankan.
  const groups = React.useMemo(() => {
    const map = new Map<string, CorpusItem[]>();
    filtered.slice(0, limit).forEach((d) => {
      const list = map.get(d.regulation) ?? [];
      list.push(d);
      map.set(d.regulation, list);
    });
    return Array.from(map.entries());
  }, [filtered, limit]);

  function resetFilters() {
    setQuery("");
    setCategory(null);
  }

  return (
    <div>
      {/* Toolbar menempel di atas saat daftar di-scroll */}
      <div className="sticky top-0 z-10 space-y-3 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
        {data && (
          <dl className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card">
            <Stat label="Dokumen" value={items.length} />
            <Stat label="Regulasi" value={regulationCount} />
            <Stat label="Kategori" value={categories.length} />
          </dl>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari regulasi, judul, atau isi…"
              aria-label="Cari dokumen"
              className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Hapus pencarian"
                className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => refetch()}
            aria-label="Muat ulang daftar"
            title="Muat ulang"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        {categories.length > 0 && (
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5">
            <Chip active={category === null} onClick={() => setCategory(null)}>
              Semua <span className="opacity-70">{items.length}</span>
            </Chip>
            {categories.map(([c, n]) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
                {c} <span className="opacity-70">{n}</span>
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-5 p-4">
        {isLoading && (
          <div className="space-y-2" aria-busy aria-label="Memuat daftar dokumen">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-shimmer h-[88px] rounded-xl" />
            ))}
          </div>
        )}

        {isError && (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="font-medium text-destructive">Daftar dokumen gagal dimuat</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Periksa koneksi ke backend."}
            </p>
            <button onClick={() => refetch()} className="mt-3 text-xs font-medium text-primary hover:underline">
              Coba lagi
            </button>
          </div>
        )}

        {data && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center">
            <SearchX className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground">
              {items.length === 0 ? "Belum ada dokumen" : "Tidak ada dokumen yang cocok"}
            </p>
            <p className="text-xs text-muted-foreground">
              {items.length === 0
                ? "Unggah PDF pertama pada tab Unggah PDF."
                : "Ubah kata kunci atau pilih kategori lain."}
            </p>
            {items.length > 0 && (
              <button onClick={resetFilters} className="mt-1 text-xs font-medium text-primary hover:underline">
                Reset pencarian dan filter
              </button>
            )}
          </div>
        )}

        {groups.map(([regulation, list]) => (
          <section key={regulation} aria-label={regulation}>
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <h3 className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground" title={regulation}>
                <Highlight text={regulation} query={query} />
              </h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                {list.length}
              </span>
            </div>
            <ul className="space-y-2 border-l-2 border-border pl-3">
              {list.map((item) => (
                <CorpusCard
                  key={item.id}
                  item={item}
                  query={query}
                  expanded={openId === item.id}
                  onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                  onAsk={onAsk}
                />
              ))}
            </ul>
          </section>
        ))}

        {filtered.length > limit && (
          <button
            onClick={() => setLimit((l) => l + PAGE_SIZE)}
            className="w-full rounded-lg border border-border bg-card py-2 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Tampilkan {Math.min(PAGE_SIZE, filtered.length - limit)} lagi
            <span className="text-muted-foreground"> · sisa {filtered.length - limit}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function CorpusCard({
  item,
  query,
  expanded,
  onToggle,
  onAsk,
}: {
  item: CorpusItem;
  query: string;
  expanded: boolean;
  onToggle: () => void;
  onAsk: (q: string) => void;
}) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(item.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  }

  return (
    <li
      className={`overflow-hidden rounded-xl border bg-card shadow-sm transition-colors ${
        expanded ? "border-primary/40" : "border-border hover:border-primary/30"
      }`}
    >
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 px-3.5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium leading-snug text-foreground">
            <Highlight text={item.title} query={query} />
          </span>
          {item.category && (
            <span className="mt-1.5 inline-block rounded-md bg-accent/15 px-1.5 py-0.5 text-[11px] font-medium text-[hsl(var(--accent))]">
              {item.category}
            </span>
          )}
          {!expanded && (
            <span className="mt-2 line-clamp-2 block font-serif text-[13px] leading-snug text-muted-foreground">
              {item.content}
            </span>
          )}
        </span>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
        aria-hidden={!expanded}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-border px-3.5 py-3">
            <blockquote className="max-h-72 overflow-y-auto whitespace-pre-wrap border-l-2 border-accent pl-3 font-serif text-[14px] leading-relaxed text-foreground/90">
              {item.content}
            </blockquote>
            <div className="flex items-center gap-2">
              <button
                tabIndex={expanded ? 0 : -1}
                onClick={() => onAsk(`Jelaskan ${item.regulation} — ${item.title}`)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
                Tanyakan ini
              </button>
              <button
                tabIndex={expanded ? 0 : -1}
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" aria-hidden />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                )}
                {copied ? "Tersalin" : "Salin isi"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

// ── Tab: upload PDF ───────────────────────────────────────────────

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function UploadTab() {
  const mutation = useUploadPdf();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  function pick(f?: File | null) {
    if (!f) return;
    mutation.reset();
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setLocalError("Hanya file PDF yang didukung.");
      setFile(null);
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setLocalError(`Ukuran file maksimal ${MAX_MB} MB.`);
      setFile(null);
      return;
    }
    setLocalError(null);
    setFile(f);
  }

  function submit() {
    if (!file) return;
    mutation.mutate(file, { onSuccess: () => setFile(null) });
  }

  return (
    <div className="space-y-4 p-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Tambahkan dokumen POJK dalam format PDF ke Kamus Data. Setelah
        diproses, isinya bisa dijadikan rujukan jawaban.
      </p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
        }`}
      >
        <UploadCloud className="h-7 w-7 text-primary" aria-hidden />
        <span className="text-sm font-medium text-foreground">Tarik file PDF ke sini, atau klik untuk memilih</span>
        <span className="text-xs text-muted-foreground">Maksimal {MAX_MB} MB</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {file && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          <FileUp className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
          </div>
          <button
            onClick={() => setFile(null)}
            aria-label="Hapus file terpilih"
            disabled={mutation.isPending}
            className="text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {(localError || mutation.isError) && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {localError ?? mutation.error?.message}
        </p>
      )}

      {mutation.isSuccess && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/10 px-3 py-2 text-sm text-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]" aria-hidden />
          Dokumen berhasil diunggah. Daftar dokumen sudah diperbarui.
        </p>
      )}

      <button
        onClick={submit}
        disabled={!file || mutation.isPending}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40"
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Mengunggah…
          </>
        ) : (
          "Unggah dokumen"
        )}
      </button>
    </div>
  );
}
