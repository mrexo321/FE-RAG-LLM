import { useMutation } from "@tanstack/react-query";

import { askQuestion } from "@/lib/api";
import type { AskRequest, AskResponse } from "@/types/rag";

/**
 * Mutation hook untuk mengirim pertanyaan ke endpoint RAG (/api/v1/insurance-rag/ask).
 * Dipakai lewat askMutation.mutate({ question }) dari komponen form.
 */
export function useAsk() {
  return useMutation<AskResponse, Error, AskRequest>({
    mutationFn: askQuestion,
  });
}
