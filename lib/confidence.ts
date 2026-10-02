import type { ChatMessage } from "@/types/rag";

export type ConfidenceLevel = "high" | "medium" | "low" | "none";

export const CONFIDENCE_THRESHOLDS = {
  HIGH_SCORE: 0.75,
  HIGH_MIN_SOURCES: 2,
  MEDIUM_SCORE: 0.5,
};

/**
 * Menilai tingkat keandalan jawaban berbasis regulasi POJK:
 * - "high": Didukung bukti kuat (skor >= 0.75 dan >= 2 sumber)
 * - "medium": Didukung bukti cukup (skor >= 0.5)
 * - "low": Bukti lemah atau tanpa sitasi inline padahal ada sumber
 * - "none": Di luar jangkauan / sapaan / tanpa sumber
 */
export function assessConfidence(message: ChatMessage): ConfidenceLevel {
  // Sapaan atau tanpa metode retrieval
  if (message.retrievalMethod === "GREETING" || message.retrievalMethod === "NONE") {
    return "none";
  }

  const sources = message.sources;
  if (!sources || sources.length === 0) {
    return "none";
  }

  // Ambil skor yang valid dalam rentang 0 sampai 1
  const validScores = sources
    .map((s) => s.score)
    .filter((score): score is number => typeof score === "number" && score >= 0 && score <= 1);

  let level: "high" | "medium" | "low";

  if (validScores.length > 0) {
    const topScore = Math.max(...validScores);
    if (
      topScore >= CONFIDENCE_THRESHOLDS.HIGH_SCORE &&
      sources.length >= CONFIDENCE_THRESHOLDS.HIGH_MIN_SOURCES
    ) {
      level = "high";
    } else if (topScore >= CONFIDENCE_THRESHOLDS.MEDIUM_SCORE) {
      level = "medium";
    } else {
      level = "low";
    }
  } else {
    // Jika backend tidak menyediakan skor berskala 0-1, gunakan jumlah sumber sebagai aproksimasi
    level = sources.length >= CONFIDENCE_THRESHOLDS.HIGH_MIN_SOURCES ? "medium" : "low";
  }

  // Jika jawaban tidak mengandung satu pun penanda sitasi [n] padahal ada sumber, turunkan 1 tingkat
  const hasCitation = /\[\d+(?:\s*,\s*\d+)*\]/.test(message.content);
  if (!hasCitation) {
    if (level === "high") {
      level = "medium";
    } else if (level === "medium") {
      level = "low";
    }
  }

  return level;
}
