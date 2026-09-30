import type { AskRequest, AskResponse , CorpusItem } from "@/types/rag";

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

export async function askQuestion(payload: AskRequest): Promise<AskResponse> {
  const res = await fetch(`${API_BASE_URL}${BASE_PATH}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topK: 5, ...payload }),
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
  form.append("file", file); // nama field harus "file"

  // Jangan set Content-Type manual, browser mengisi boundary multipart sendiri.
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
