"use client";

import * as React from "react";
import type { AgentStep, ChatMessage, FeedbackPayload, SourceDocument } from "@/types/rag";

// ── Sidebar State ───────────────────────────────────────────────────

export interface SidebarSources {
  messageId: string;
  sources: SourceDocument[];
  retrievalMethod?: string;
}

import { useAskStream } from "@/hooks/use-ask-stream";
import { useAsk } from "@/hooks/use-ask";
import { useSendFeedback } from "@/hooks/use-feedback";
import { useToast } from "@/components/toast-provider";
import { ApiError } from "@/lib/api";

function generateId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const SESSION_KEY = "rag-chat-messages";

function saveToSession(messages: ChatMessage[]) {
  try {
    const serializable = messages
      .filter((m) => !m.isLoading && !m.streaming)
      .map((m) => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp ?? null,
      }));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(serializable));
  } catch {
    /* sessionStorage tidak tersedia */
  }
}

function loadFromSession(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed.map((m) => ({
      ...m,
      timestamp: m.timestamp ? new Date(m.timestamp as string) : undefined,
    })) as ChatMessage[];
  } catch {
    return [];
  }
}

// ── Reducer untuk Manajemen State Pesan ──────────────────────────────

type ChatAction =
  | { type: "SET_ALL"; messages: ChatMessage[] }
  | { type: "ADD_PAIR"; userMsg: ChatMessage; assistantMsg: ChatMessage }
  | { type: "ADD_STEP"; messageId: string; step: AgentStep }
  | {
      type: "SET_SOURCES";
      messageId: string;
      sources: SourceDocument[];
      retrievalMethod?: string;
    }
  | { type: "APPEND_TOKENS"; messageId: string; text: string }
  | { type: "FINISH_STREAM"; messageId: string; latencyMs?: number }
  | { type: "STOP_STREAM"; messageId: string }
  | { type: "SET_ERROR"; messageId: string; error: string }
  | { type: "SET_FEEDBACK"; messageId: string; feedback?: "UP" | "DOWN" };

function chatReducer(state: ChatMessage[], action: ChatAction): ChatMessage[] {
  switch (action.type) {
    case "SET_ALL":
      return action.messages;

    case "ADD_PAIR":
      return [...state, action.userMsg, action.assistantMsg];

    case "ADD_STEP":
      return state.map((m) => {
        if (m.id !== action.messageId) return m;
        const currentSteps = m.steps ?? [];
        // Perbarui jika id langkah sudah ada, atau tambahkan jika baru
        const existingIdx = currentSteps.findIndex((s) => s.id === action.step.id);
        let nextSteps: AgentStep[];
        if (existingIdx >= 0) {
          nextSteps = currentSteps.map((s, idx) =>
            idx === existingIdx ? { ...s, ...action.step } : s
          );
        } else {
          // Tandai langkah sebelumnya sebagai done jika statusnya masih running
          nextSteps = currentSteps.map((s) =>
            s.status === "running" ? { ...s, status: "done" as const } : s
          );
          nextSteps.push(action.step);
        }
        return { ...m, steps: nextSteps };
      });

    case "SET_SOURCES":
      return state.map((m) =>
        m.id === action.messageId
          ? {
              ...m,
              sources: action.sources,
              retrievalMethod: action.retrievalMethod ?? m.retrievalMethod,
            }
          : m
      );

    case "APPEND_TOKENS":
      return state.map((m) =>
        m.id === action.messageId
          ? {
              ...m,
              content: m.content + action.text,
              isLoading: false,
              streaming: true,
            }
          : m
      );

    case "FINISH_STREAM":
      return state.map((m) => {
        if (m.id !== action.messageId) return m;
        // Semua steps selesai saat done
        const finishedSteps = m.steps?.map((s) => ({ ...s, status: "done" as const }));
        return {
          ...m,
          latencyMs: action.latencyMs ?? m.latencyMs,
          isLoading: false,
          streaming: false,
          steps: finishedSteps,
        };
      });

    case "STOP_STREAM":
      return state.map((m) =>
        m.id === action.messageId
          ? {
              ...m,
              isLoading: false,
              streaming: false,
              stopped: true,
            }
          : m
      );

    case "SET_ERROR":
      return state.map((m) =>
        m.id === action.messageId
          ? {
              ...m,
              content: m.content
                ? m.content
                : action.error || "Tidak dapat menghubungi backend.",
              isLoading: false,
              streaming: false,
              isError: true,
            }
          : m
      );

    case "SET_FEEDBACK":
      return state.map((m) =>
        m.id === action.messageId
          ? {
              ...m,
              feedback: action.feedback,
            }
          : m
      );

    default:
      return state;
  }
}

// ── Context ─────────────────────────────────────────────────────────

interface ChatContextType {
  messages: ChatMessage[];
  isPending: boolean;
  handleSubmit: (question: string, displayText?: string) => void;
  handleStop: () => void;
  handleRegenerate: () => void;
  handleFollowUp: (text: string) => void;
  handleFeedback: (
    messageId: string,
    rating: "UP" | "DOWN",
    reason?: string,
    comment?: string
  ) => Promise<void>;
  clearChat: () => void;
  inputDraft: string;
  setInputDraft: (text: string) => void;
  clarifyQuestion: (template?: string) => void;
  // Sidebar
  sidebarSources: SidebarSources | null;
  activeCiteIndex: number | null;
  isSidebarOpen: boolean;
  openSidebar: (messageId: string) => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  handleCiteClick: (messageId: string, index: number) => void;
  clearActiveCite: () => void;
}

const ChatContext = React.createContext<ChatContextType | undefined>(undefined);

export function useChat() {
  const ctx = React.useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, dispatch] = React.useReducer(chatReducer, []);
  const [isPending, setIsPending] = React.useState(false);
  const [inputDraft, setInputDraft] = React.useState("");
  const { toast } = useToast();

  // ── Sidebar state ──────────────────────────────────────────────────
  const [sidebarSources, setSidebarSources] = React.useState<SidebarSources | null>(null);
  const [activeCiteIndex, setActiveCiteIndex] = React.useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const initialized = React.useRef(false);
  const isPendingRef = React.useRef(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const pendingTokensRef = React.useRef<string>("");
  const rafIdRef = React.useRef<number | null>(null);

  // TanStack Query Mutations
  const askStreamMutation = useAskStream();
  const askSyncMutation = useAsk();
  const sendFeedbackMutation = useSendFeedback();

  isPendingRef.current = isPending;

  // Muat riwayat pesan dari sessionStorage saat awal
  React.useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const saved = loadFromSession();
    if (saved.length > 0) {
      dispatch({ type: "SET_ALL", messages: saved });
    }
  }, []);

  // Simpan ke sessionStorage setiap ada perubahan pesan yang sudah selesai
  React.useEffect(() => {
    if (initialized.current) {
      saveToSession(messages);
    }
  }, [messages]);

  // Hentikan streaming via AbortController
  const handleStop = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    pendingTokensRef.current = "";

    // Cari pesan asisten terakhir yang sedang aktif
    const lastActive = [...messages].reverse().find((m) => m.role === "assistant" && (m.isLoading || m.streaming));
    if (lastActive) {
      dispatch({ type: "STOP_STREAM", messageId: lastActive.id });
    }

    setIsPending(false);
    isPendingRef.current = false;
  }, [messages]);

  // Fungsi pengiriman pertanyaan
  const submitQuestion = React.useCallback(
    async (question: string, displayText?: string) => {
      if (isPendingRef.current) return;

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: displayText ?? question,
        timestamp: new Date(),
      };
      const assistantId = generateId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
        streaming: false,
        steps: [
          {
            id: "step_start",
            label: "Mencari pasal yang relevan…",
            status: "running",
          },
        ],
      };

      dispatch({ type: "ADD_PAIR", userMsg, assistantMsg });
      setIsPending(true);
      isPendingRef.current = true;

      const controller = new AbortController();
      abortControllerRef.current = controller;
      pendingTokensRef.current = "";

      const promptWithCitation = question.includes("[1]")
        ? question
        : `${question}\n\n(Catatan: Cantumkan label sitasi nomor referensi seperti [1], [2] pada setiap poin atau kalimat jawaban yang bersumber dari dokumen, agar pengguna mengetahui asal pasalnya.)`;

      // Batching token menggunakan requestAnimationFrame
      const scheduleTokenFlush = (token: string) => {
        pendingTokensRef.current += token;
        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(() => {
            const chunk = pendingTokensRef.current;
            pendingTokensRef.current = "";
            rafIdRef.current = null;
            if (chunk) {
              dispatch({ type: "APPEND_TOKENS", messageId: assistantId, text: chunk });
            }
          });
        }
      };

      try {
        // ── 1. Coba jalur utama: Streaming SSE (/ask/stream atau /ask-stream)
        await askStreamMutation.mutateAsync({
          payload: { question: promptWithCitation },
          signal: controller.signal,
          handlers: {
            onStep: (step) => {
              dispatch({ type: "ADD_STEP", messageId: assistantId, step });
            },
            onSources: (data) => {
              dispatch({
                type: "SET_SOURCES",
                messageId: assistantId,
                sources: data.sources,
                retrievalMethod: data.retrievalMethod,
              });
            },
            onToken: (text) => {
              scheduleTokenFlush(text);
            },
            onDone: (data) => {
              if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
              }
              if (pendingTokensRef.current) {
                dispatch({
                  type: "APPEND_TOKENS",
                  messageId: assistantId,
                  text: pendingTokensRef.current,
                });
                pendingTokensRef.current = "";
              }
              dispatch({
                type: "FINISH_STREAM",
                messageId: assistantId,
                latencyMs: data.latencyMs,
              });
              setIsPending(false);
              isPendingRef.current = false;
            },
            onError: (err) => {
              if (controller.signal.aborted) return;
              dispatch({
                type: "SET_ERROR",
                messageId: assistantId,
                error: err.message || "Terjadi kesalahan pada respon streaming.",
              });
              setIsPending(false);
              isPendingRef.current = false;
            },
          },
        });
      } catch (err: unknown) {
        if (controller.signal.aborted) {
          // User menghentikan via tombol Stop
          return;
        }

        const apiErr = err as ApiError;
        // Fallback backward-compatible: jika endpoint stream 404/405, fallback ke synchronous /ask
        if (apiErr?.status === 404 || apiErr?.status === 405) {
          try {
            const syncResponse = await askSyncMutation.mutateAsync(
              { question: promptWithCitation },
              // Signal diteruskan
            );
            dispatch({
              type: "SET_SOURCES",
              messageId: assistantId,
              sources: syncResponse.sources,
              retrievalMethod: syncResponse.retrievalMethod,
            });
            dispatch({
              type: "APPEND_TOKENS",
              messageId: assistantId,
              text: syncResponse.answer,
            });
            dispatch({
              type: "FINISH_STREAM",
              messageId: assistantId,
              latencyMs: syncResponse.latencyMs,
            });
          } catch (syncErr: unknown) {
            const fallbackMsg = (syncErr as Error)?.message || "Gagal memproses jawaban dari server.";
            dispatch({ type: "SET_ERROR", messageId: assistantId, error: fallbackMsg });
          }
        } else {
          dispatch({
            type: "SET_ERROR",
            messageId: assistantId,
            error: (err as Error)?.message || "Koneksi backend gagal.",
          });
        }
        setIsPending(false);
        isPendingRef.current = false;
      } finally {
        abortControllerRef.current = null;
      }
    },
    [askStreamMutation, askSyncMutation]
  );

  // Buat ulang pertanyaan terakhir
  const handleRegenerate = React.useCallback(() => {
    if (isPendingRef.current) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    submitQuestion(lastUser.content);
  }, [messages, submitQuestion]);

  // Pertanyaan lanjutan
  const handleFollowUp = React.useCallback(
    (text: string) => {
      if (isPendingRef.current) return;
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      submitQuestion(lastUser ? `${text} (mengenai: ${lastUser.content})` : text, text);
    },
    [messages, submitQuestion]
  );

  // Kirim feedback 👍 / 👎 dengan update optimistis
  const handleFeedback = React.useCallback(
    async (
      messageId: string,
      rating: "UP" | "DOWN",
      reason?: string,
      comment?: string
    ) => {
      const target = messages.find((m) => m.id === messageId);
      if (!target) return;

      const previousRating = target.feedback;
      // Update optimistis
      dispatch({ type: "SET_FEEDBACK", messageId, feedback: rating });

      // Ambil pertanyaan pasangan
      const targetIdx = messages.findIndex((m) => m.id === messageId);
      const questionMsg = messages.slice(0, targetIdx).reverse().find((m) => m.role === "user");
      const question = questionMsg?.content || "";

      const sourceIds = (target.sources?.map((s) => s.id).filter(Boolean) as string[]) ?? [];

      const payload: FeedbackPayload = {
        question,
        answer: target.content,
        rating,
        reason,
        comment,
        sourceIds,
      };

      try {
        await sendFeedbackMutation.mutateAsync(payload);
        toast("Terima kasih atas masukannya.", "success");
      } catch {
        // Rollback update jika gagal
        dispatch({ type: "SET_FEEDBACK", messageId, feedback: previousRating });
        toast("Feedback belum terkirim. Coba lagi.", "error");
      }
    },
    [messages, sendFeedbackMutation, toast]
  );

  const clearChat = React.useCallback(() => {
    handleStop();
    dispatch({ type: "SET_ALL", messages: [] });
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, [handleStop]);

  const clarifyQuestion = React.useCallback((template = "Maksud saya: ") => {
    setInputDraft(template);
  }, []);

  // ── Sidebar handlers ──────────────────────────────────────────────

  const openSidebar = React.useCallback(
    (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (msg?.sources && msg.sources.length > 0) {
        setSidebarSources({
          messageId: msg.id,
          sources: msg.sources,
          retrievalMethod: msg.retrievalMethod,
        });
        setIsSidebarOpen(true);
      }
    },
    [messages]
  );

  const closeSidebar = React.useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const toggleSidebar = React.useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const handleCiteClick = React.useCallback(
    (messageId: string, index: number) => {
      const msg = messages.find((m) => m.id === messageId);
      if (msg?.sources && msg.sources.length > 0) {
        setSidebarSources({
          messageId: msg.id,
          sources: msg.sources,
          retrievalMethod: msg.retrievalMethod,
        });
        setActiveCiteIndex(index);
        setIsSidebarOpen(true);
      }
    },
    [messages]
  );

  const clearActiveCite = React.useCallback(() => {
    setActiveCiteIndex(null);
  }, []);

  // Auto-open sidebar saat sources tersedia pada pesan terakhir
  React.useEffect(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (
      lastAssistant &&
      lastAssistant.sources &&
      lastAssistant.sources.length > 0 &&
      !lastAssistant.isLoading &&
      !lastAssistant.streaming
    ) {
      setSidebarSources({
        messageId: lastAssistant.id,
        sources: lastAssistant.sources,
        retrievalMethod: lastAssistant.retrievalMethod,
      });
    }
  }, [messages]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isPending,
        handleSubmit: submitQuestion,
        handleStop,
        handleRegenerate,
        handleFollowUp,
        handleFeedback,
        clearChat,
        inputDraft,
        setInputDraft,
        clarifyQuestion,
        sidebarSources,
        activeCiteIndex,
        isSidebarOpen,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        handleCiteClick,
        clearActiveCite,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
