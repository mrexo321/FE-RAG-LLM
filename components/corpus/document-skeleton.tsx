import * as React from "react";

export function DocumentCardSkeleton({ view }: { view: "grid" | "list" }) {
  if (view === "list") {
    return (
      <div className="flex animate-pulse items-center justify-between rounded-xl border border-border bg-card p-4">
        <div className="flex-1 space-y-2.5">
          <div className="flex gap-2">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
          <div className="h-5 w-2/3 rounded bg-muted" />
          <div className="h-3 w-5/6 rounded bg-muted" />
        </div>
        <div className="ml-4 h-8 w-20 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 animate-pulse">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
        </div>
        <div className="h-5 w-3/4 rounded bg-muted" />
        <div className="space-y-1.5 pt-1">
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-5/6 rounded bg-muted" />
          <div className="h-3 w-2/3 rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-6 w-16 rounded bg-muted" />
      </div>
    </div>
  );
}

export function DocumentListSkeleton({ view }: { view: "grid" | "list" }) {
  const items = Array.from({ length: 6 });
  return (
    <div
      className={
        view === "grid"
          ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          : "space-y-3"
      }
    >
      {items.map((_, i) => (
        <DocumentCardSkeleton key={i} view={view} />
      ))}
    </div>
  );
}

export function PdfReaderSkeleton() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col bg-muted/30 animate-pulse">
      {/* Fake Toolbar */}
      <div className="h-14 border-b border-border bg-card px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-muted" />
          <div className="h-9 w-64 rounded-lg bg-muted" />
        </div>
        <div className="h-8 w-40 rounded-lg bg-muted" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 rounded-lg bg-muted" />
          <div className="h-8 w-24 rounded-lg bg-muted" />
        </div>
      </div>

      {/* Fake Paper Sheet */}
      <div className="flex-1 flex justify-center p-4 sm:p-10">
        <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 sm:p-12 space-y-6">
          <div className="space-y-2 border-b-2 border-muted pb-4">
            <div className="mx-auto h-4 w-48 rounded bg-muted" />
            <div className="mx-auto h-3 w-72 rounded bg-muted" />
          </div>
          <div className="flex justify-between">
            <div className="h-5 w-36 rounded bg-muted" />
            <div className="h-4 w-28 rounded bg-muted" />
          </div>
          <div className="h-8 w-3/4 rounded bg-muted" />
          <div className="space-y-3 pt-4">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-4/6 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

