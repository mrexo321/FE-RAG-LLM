import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCorpus, uploadPdf } from "@/lib/api";

/** Daftar dokumen di basis pengetahuan. `enabled` agar hanya dimuat saat panel dibuka. */
export function useCorpus(enabled: boolean) {
  return useQuery({
    queryKey: ["corpus"],
    queryFn: getCorpus,
    enabled,
    staleTime: 60_000,
  });
}

/** Upload PDF, lalu otomatis menyegarkan daftar corpus. */
export function useUploadPdf() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, File>({
    mutationFn: uploadPdf,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["corpus"] }),
  });
}
