export interface AskRequest {
  question: string;
  topK?: number;
}

export interface SourceDocument {
  id?: string;
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

// ── Agent Steps & Stream Handlers ────────────────────────────────────

export interface AgentStep {
  id: string;
  label: string;
  detail?: string;
  status?: "pending" | "running" | "done";
}

export interface StreamHandlers {
  onStep?: (step: AgentStep) => void;
  onSources?: (data: { retrievalMethod?: string; sources: SourceDocument[] }) => void;
  onToken?: (text: string) => void;
  onDone?: (data: { latencyMs?: number }) => void;
  onError?: (error: Error) => void;
}

// ── Feedback Types ──────────────────────────────────────────────────

export interface FeedbackPayload {
  question: string;
  answer: string;
  rating: "UP" | "DOWN";
  reason?: string;
  comment?: string;
  sourceIds: string[];
}

// ── Chat message types ──────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceDocument[];
  retrievalMethod?: string;
  latencyMs?: number;
  isLoading?: boolean;
  isError?: boolean;
  timestamp?: Date;
  steps?: AgentStep[];
  streaming?: boolean;
  stopped?: boolean;
  feedback?: "UP" | "DOWN";
}

export interface CorpusItem {
  id: string;
  regulation: string;
  title: string;
  category: string;
  content: string;
}

// ── Upload types ────────────────────────────────────────────────────

export interface UploadResult {
  message?: string;
  filename?: string;
  [key: string]: unknown;
}

export type FileStatus =
  | "menunggu"
  | "mengunggah"
  | "memproses"
  | "selesai"
  | "gagal"
  | "dibatalkan";

export interface FileQueueItem {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
  abortController?: AbortController;
}

// ── Corpus stats ────────────────────────────────────────────────────

export interface CorpusStats {
  totalDocuments: number;
  totalRegulations: number;
  totalCategories: number;
}
