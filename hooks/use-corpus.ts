"use client";

import { useQuery } from "@tanstack/react-query";

import { getCorpus } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { CorpusItem, CorpusStats } from "@/types/rag";

/** Daftar dokumen di basis pengetahuan. Selalu aktif. */
export function useCorpus() {
  return useQuery({
    queryKey: queryKeys.corpus,
    queryFn: getCorpus,
    staleTime: 5 * 60_000,
  });
}

/** Ambil satu dokumen dari cache corpus berdasarkan id. Tidak ada request kedua. */
export function useCorpusItem(id: string) {
  return useQuery({
    queryKey: queryKeys.corpus,
    queryFn: getCorpus,
    staleTime: 5 * 60_000,
    select: (items: CorpusItem[]) => items.find((i) => i.id === id),
  });
}

/** Statistik corpus: jumlah dokumen, regulasi, dan kategori. */
export function useCorpusStats() {
  return useQuery({
    queryKey: queryKeys.corpus,
    queryFn: getCorpus,
    staleTime: 5 * 60_000,
    select: (items: CorpusItem[]): CorpusStats => ({
      totalDocuments: items.length,
      totalRegulations: new Set(items.map((i) => i.regulation)).size,
      totalCategories: new Set(items.filter((i) => i.category).map((i) => i.category)).size,
    }),
  });
}
