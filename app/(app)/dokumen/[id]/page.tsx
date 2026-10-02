"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";

import { useCorpus } from "@/hooks/use-corpus";
import { PdfReader } from "@/components/corpus/pdf-reader";
import { PdfReaderSkeleton } from "@/components/corpus/document-skeleton";

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const {
    data: items = [],
    isPending,
    isFetching,
    isError,
    refetch,
  } = useCorpus();

  if (isPending) {
    return <PdfReaderSkeleton />;
  }

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
            href="/dokumen"
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Dokumen</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PdfReader
      items={items}
      initialDocId={id}
      isFetching={isFetching}
      onRefresh={() => refetch()}
      onClose={() => router.push("/dokumen")}
    />
  );
}
