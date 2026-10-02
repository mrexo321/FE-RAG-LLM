"use client";

import { useQuery } from "@tanstack/react-query";

import { getHealth } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

/**
 * Query hook untuk status backend (/api/v1/insurance-rag/health).
 * Dipoll ringan setiap 30 detik agar indikator koneksi tetap akurat.
 */
export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: getHealth,
    retry: 1,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
