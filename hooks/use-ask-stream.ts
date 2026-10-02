"use client";

import { useMutation } from "@tanstack/react-query";
import { askStream } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AskRequest, StreamHandlers } from "@/types/rag";

export interface AskStreamVariables {
  payload: AskRequest;
  handlers: StreamHandlers;
  signal?: AbortSignal;
}

/**
 * Mutation hook untuk streaming jawaban SSE (/api/v1/insurance-rag/ask/stream).
 * Sesuai aturan arsitektur data layer: dibungkus useMutation dengan retry: 0.
 */
export function useAskStream() {
  return useMutation<void, Error, AskStreamVariables>({
    mutationKey: queryKeys.askStream,
    mutationFn: ({ payload, handlers, signal }) =>
      askStream(payload, handlers, signal),
    retry: 0,
  });
}
