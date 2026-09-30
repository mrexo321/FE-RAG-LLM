export interface AskRequest {
  question: string;
  topK?: number;
}

export interface SourceDocument {
  regulation: string;
  title: string;
  category: string;
  score: number;
  content: string;
}

export type RetrievalMethod =
  | "PGVECTOR"
  | "KEYWORD_FALLBACK"
  | "HYBRID_SEARCH"
  | "GREETING"
  | "NONE";

export interface AskResponse {
  question: string;
  answer: string;
  sources: SourceDocument[];
  latencyMs: number;
  retrievalMethod: RetrievalMethod;
}

export interface ApiErrorBody {
  message?: string;
  error?: string;
  status?: number;
}

// ── Chat message types ──────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceDocument[];
  retrievalMethod?: RetrievalMethod;
  latencyMs?: number;
  timestamp: Date;
  isLoading?: boolean;
  isError?: boolean;
}

export interface CorpusItem {
  id: string;
  regulation: string;
  title: string;
  category: string;
  content: string;
}
