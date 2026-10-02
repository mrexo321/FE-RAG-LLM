"use client";

import { useMutation } from "@tanstack/react-query";
import { sendFeedback } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { FeedbackPayload } from "@/types/rag";

/**
 * Mutation hook untuk mengirim umpan balik (thumbs up/down) ke /api/v1/insurance-rag/feedback.
 * Retry 0 sesuai aturan arsitektur data layer.
 */
export function useSendFeedback() {
  return useMutation<unknown, Error, FeedbackPayload>({
    mutationKey: queryKeys.feedback,
    mutationFn: (payload) => sendFeedback(payload),
    retry: 0,
  });
}
