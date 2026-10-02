import * as React from "react";
import { BookOpen } from "lucide-react";
import type { SourceDocument } from "@/types/rag";

export interface FormatAnswerOptions {
  sources?: SourceDocument[];
  onCite?: (index: number) => void;
}

/**
 * Render jawaban LLM yang aman untuk streaming parsial:
 * - Tidak crash pada ** yang belum tertutup atau [ yang belum selesai
 * - Sitasi inline [n], [n, m] menjadi chip tombol dengan token accent
 * - Angka di luar rentang sumber tampil sebagai teks biasa
 * - Label rujukan resmi (Sumber: ...)
 */
export function formatAnswer(
  text: string,
  optionsOrSources?: FormatAnswerOptions | SourceDocument[],
  legacyOnCite?: (index: number) => void
): React.ReactNode {
  // Dukungan backward-compatible untuk pemanggilan dengan signature lama
  let sources: SourceDocument[] | undefined;
  let onCite: ((index: number) => void) | undefined;

  if (Array.isArray(optionsOrSources)) {
    sources = optionsOrSources;
    onCite = legacyOnCite;
  } else if (optionsOrSources && typeof optionsOrSources === "object") {
    sources = optionsOrSources.sources;
    onCite = optionsOrSources.onCite;
  }

  const blocks = text.split(/\n{2,}/);

  return blocks.map((block, bIdx) => {
    const lines = block.split("\n").filter((l) => l.trim().length > 0);
    const isBullet = lines.length > 0 && lines.every((l) => /^\s*[-*•]\s+/.test(l));
    const isOrdered = lines.length > 0 && lines.every((l) => /^\s*\d+[.)]\s+/.test(l));

    if (isBullet || isOrdered) {
      const Tag = isOrdered ? "ol" : "ul";
      return (
        <Tag
          key={bIdx}
          className={`mb-3 space-y-1.5 pl-5 last:mb-0 ${
            isOrdered ? "list-decimal" : "list-disc"
          } marker:text-primary`}
        >
          {lines.map((l, i) => (
            <li key={i}>
              {renderInline(
                l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""),
                sources,
                onCite
              )}
            </li>
          ))}
        </Tag>
      );
    }

    return (
      <div key={bIdx} className="mb-3 last:mb-0">
        {lines.map((line, lIdx) => {
          // Format rujukan sumber di baris akhir: (Sumber: ...)
          if (/^\s*\((?:Sumber|Rujukan):?\s*[^)]+\)\s*$/i.test(line)) {
            const cleanText = line.trim().replace(/^\(/, "").replace(/\)$/, "");
            return (
              <div
                key={lIdx}
                className="mt-3 flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground"
              >
                <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-medium">{cleanText}</span>
              </div>
            );
          }

          return (
            <p key={lIdx} className="leading-relaxed">
              {renderInline(line, sources, onCite)}
              {lIdx < lines.length - 1 && <br />}
            </p>
          );
        })}
      </div>
    );
  });
}

function renderInline(
  line: string,
  sources?: SourceDocument[],
  onCite?: (index: number) => void
): React.ReactNode {
  // Pisahkan teks berdasarkan **bold** (tahan terhadap unclosed ** saat streaming)
  const boldParts = line.split(/(\*\*[^*]+(?:\*\*|$))/g).filter(Boolean);

  return boldParts.map((part, idx) => {
    if (part.startsWith("**")) {
      const isClosed = part.endsWith("**") && part.length >= 4;
      const content = isClosed ? part.slice(2, -2) : part.slice(2);
      return (
        <strong key={idx} className="font-semibold text-foreground">
          {renderCitations(content, sources, onCite)}
        </strong>
      );
    }
    return (
      <React.Fragment key={idx}>
        {renderCitations(part, sources, onCite)}
      </React.Fragment>
    );
  });
}

/**
 * Mengubah [1], [2], [1, 3] menjadi tombol chip sitasi.
 * Angka di luar rentang sources tidak dijadikan chip (tampil sebagai teks biasa).
 */
function renderCitations(
  text: string,
  sources?: SourceDocument[],
  onCite?: (index: number) => void
): React.ReactNode {
  // Hanya cocokkan penanda sitasi kurung siku yang LENGKAP: [1] atau [1, 2]
  const completeCitationRegex = /(\[\s*\d+(?:\s*,\s*\d+)*\s*\])/g;
  const segments = text.split(completeCitationRegex);

  return segments.map((seg, sIdx) => {
    if (/^\[\s*\d+(?:\s*,\s*\d+)*\s*\]$/.test(seg)) {
      const numbers = seg.match(/\d+/g)?.map(Number) ?? [];
      const sourcesCount = sources?.length ?? 0;

      // Periksa apakah semua angka di luar rentang
      const hasAnyValid = numbers.some((n) => n >= 1 && n <= sourcesCount);
      if (!hasAnyValid || sourcesCount === 0) {
        // Tampilkan sebagai teks biasa jika tidak ada rujukan yang valid
        return <React.Fragment key={sIdx}>{seg}</React.Fragment>;
      }

      return (
        <span key={sIdx} className="inline-flex items-center gap-0.5 mx-0.5 align-baseline">
          <span className="text-muted-foreground text-xs select-none">[</span>
          {numbers.map((num, nIdx) => {
            const isValid = num >= 1 && num <= sourcesCount;
            const sourceIndex = num - 1;
            const source = isValid && sources ? sources[sourceIndex] : null;

            return (
              <React.Fragment key={nIdx}>
                {nIdx > 0 && <span className="text-muted-foreground text-xs select-none">, </span>}
                {isValid && source ? (
                  <button
                    type="button"
                    onClick={() => onCite?.(sourceIndex)}
                    title={`${source.regulation} — ${source.title}`}
                    aria-label={`Sumber ${num}: ${source.regulation}`}
                    className="inline-flex h-[18px] min-w-[18px] sm:h-5 sm:min-w-5 items-center justify-center rounded bg-accent/20 px-1 font-mono text-[11px] font-semibold tabular-nums text-[hsl(var(--accent))] hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer select-none -translate-y-0.5"
                  >
                    {num}
                  </button>
                ) : (
                  <span className="font-mono text-xs text-muted-foreground">{num}</span>
                )}
              </React.Fragment>
            );
          })}
          <span className="text-muted-foreground text-xs select-none">]</span>
        </span>
      );
    }

    return <React.Fragment key={sIdx}>{seg}</React.Fragment>;
  });
}
