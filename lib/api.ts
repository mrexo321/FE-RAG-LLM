import type {
  AgentStep,
  AskRequest,
  AskResponse,
  CorpusItem,
  FeedbackPayload,
  RetrievalMethod,
  SourceDocument,
  StreamHandlers,
} from "@/types/rag";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const BASE_PATH = "/api/v1/insurance-rag";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.message ?? body?.error ?? `Permintaan gagal (HTTP ${res.status})`;
  } catch {
    return `Permintaan gagal (HTTP ${res.status})`;
  }
}

// ── Streaming SSE API ────────────────────────────────────────────────

function dispatchSseEvent(
  eventName: string,
  dataRaw: string,
  handlers: StreamHandlers
) {
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = dataRaw ? JSON.parse(dataRaw) : {};
  } catch {
    parsed = null;
  }

  const normEvent = eventName.toLowerCase();

  if (normEvent === "step") {
    if (parsed) {
      handlers.onStep?.({
        id: (parsed.id as string) || `step_${Date.now()}`,
        label: (parsed.label as string) || "Memproses...",
        detail: parsed.detail as string | undefined,
        status: (parsed.status as "pending" | "running" | "done") || "running",
      });
    }
  } else if (normEvent === "sources" || normEvent === "metadata") {
    if (parsed) {
      handlers.onSources?.({
        retrievalMethod: parsed.retrievalMethod as string | undefined,
        sources: (parsed.sources as SourceDocument[]) || [],
      });
    }
  } else if (normEvent === "token" || normEvent === "content") {
    const tokenText =
      parsed?.text !== undefined
        ? String(parsed.text)
        : parsed?.content !== undefined
        ? String(parsed.content)
        : dataRaw;
    if (tokenText) {
      handlers.onToken?.(tokenText);
    }
  } else if (normEvent === "done") {
    handlers.onDone?.({
      latencyMs: typeof parsed?.latencyMs === "number" ? parsed.latencyMs : undefined,
    });
  } else if (normEvent === "error") {
    const errMsg = (parsed?.message as string) || dataRaw || "Terjadi kesalahan pada stream.";
    handlers.onError?.(new Error(errMsg));
  }
}

/**
 * Membaca stream SSE dari backend.
 * Jalur utama: /ask/stream
 * Fallback backward-compatible: jika 404/405, mencoba /ask-stream.
 * Jika keduanya tidak ada (404/405), throw ApiError agar caller fallback ke /ask.
 */
export async function askStream(
  payload: AskRequest,
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}${BASE_PATH}/ask-stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topK: 5, ...payload }),
      signal,
    });

    if (res.status === 404 || res.status === 405) {
      // Coba endpoint /ask-stream sebelumnya
      const fallbackStream = await fetch(`${API_BASE_URL}${BASE_PATH}/ask-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topK: 5, ...payload }),
        signal,
      });

      if (fallbackStream.ok) {
        res = fallbackStream;
      } else {
        throw new ApiError(await parseErrorMessage(res), res.status);
      }
    }
  } catch (err: unknown) {
    if (signal?.aborted) {
      return;
    }
    throw err;
  }

  if (!res.ok) {
    throw new ApiError(await parseErrorMessage(res), res.status);
  }

  if (!res.body) {
    throw new ApiError("Response body tidak tersedia untuk streaming", 500);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let currentEvent = "";
  let currentDataLines: string[] = [];

  const flushEvent = () => {
    if (!currentEvent && currentDataLines.length === 0) return;
    const evt = currentEvent || "token";
    const data = currentDataLines.join("\n");
    currentEvent = "";
    currentDataLines = [];
    dispatchSseEvent(evt, data, handlers);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          flushEvent();
          continue;
        }

        if (line.startsWith("event:")) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          currentDataLines.push(line.slice(5).trim());
        } else if (line.startsWith(":")) {
          // SSE comment ping
        }
      }
    }

    // Flush decoder terakhir
    buffer += decoder.decode();
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith("event:")) {
        currentEvent = trimmed.slice(6).trim();
      } else if (trimmed.startsWith("data:")) {
        currentDataLines.push(trimmed.slice(5).trim());
      }
      flushEvent();
    }
  } catch (err: unknown) {
    if (signal?.aborted) {
      return;
    }
    const error = err instanceof Error ? err : new Error("Koneksi streaming terputus");
    handlers.onError?.(error);
    throw error;
  }
}

// ── Feedback API ────────────────────────────────────────────────────

export async function sendFeedback(
  payload: FeedbackPayload,
  signal?: AbortSignal
): Promise<unknown> {
  const res = await fetch(`${API_BASE_URL}${BASE_PATH}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    throw new ApiError(await parseErrorMessage(res), res.status);
  }

  try {
    return await res.json();
  } catch {
    return { success: true };
  }
}

// ── Standard Synchronous APIs ────────────────────────────────────────

export async function askQuestion(
  payload: AskRequest,
  signal?: AbortSignal
): Promise<AskResponse> {
  const res = await fetch(`${API_BASE_URL}${BASE_PATH}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topK: 5, ...payload }),
    signal,
  });

  if (!res.ok) {
    throw new ApiError(await parseErrorMessage(res), res.status);
  }

  return res.json();
}

export interface HealthStatus {
  status: string;
  service: string;
  database: string;
  model: string;
}

export async function getHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE_URL}${BASE_PATH}/health`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new ApiError(await parseErrorMessage(res), res.status);
  }

  return res.json();
}

export async function getCorpus(): Promise<CorpusItem[]> {
  const res = await fetch(`${API_BASE_URL}${BASE_PATH}/corpus`, { method: "GET" });

  if (!res.ok) {
    throw new ApiError(await parseErrorMessage(res), res.status);
  }

  return res.json();
}

export async function uploadPdf(file: File): Promise<unknown> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE_URL}${BASE_PATH}/upload-pdf`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new ApiError(await parseErrorMessage(res), res.status);
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
