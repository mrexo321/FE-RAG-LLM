"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, MessageSquareText } from "lucide-react";

import type { CorpusItem } from "@/types/rag";
import { Badge } from "@/components/ui/badge";

interface DocumentCardProps {
  item: CorpusItem;
  view: "grid" | "list";
}

export function DocumentCard({ item, view }: DocumentCardProps) {
  const router = useRouter();

  function handleAsk(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const prompt = `Jelaskan mengenai ${item.title} pada ${item.regulation}`;
    router.push(`/?q=${encodeURIComponent(prompt)}`);
  }

  if (view === "list") {
    return (
      <Link
        href={`/dokumen/${item.id}`}
        className="group flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-muted/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-row sm:items-center"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-primary">
              {item.regulation}
            </span>
            {item.category && (
              <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">
                {item.category}
              </Badge>
            )}
          </div>
          <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
            {item.content}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleAsk}
            title="Tanyakan dokumen ini ke AI"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tanyakan</span>
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground group-hover:translate-x-0.5 group-hover:text-primary transition-all">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/dokumen/${item.id}`}
      className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary">
            {item.regulation}
          </span>
          {item.category && (
            <Badge variant="muted" className="text-[11px] font-normal">
              {item.category}
            </Badge>
          )}
        </div>

        <div>
          <h3 className="line-clamp-2 text-base font-semibold text-foreground transition-colors group-hover:text-primary">
            {item.title}
          </h3>
          <p className="mt-2 line-clamp-3 font-serif text-xs leading-relaxed text-muted-foreground">
            {item.content}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          Detail regulasi
        </span>
        <button
          type="button"
          onClick={handleAsk}
          className="flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <MessageSquareText className="h-3.5 w-3.5" />
          Tanyakan
        </button>
      </div>
    </Link>
  );
}
