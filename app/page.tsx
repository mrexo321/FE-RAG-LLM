"use client";

import * as React from "react";

import type { ChatMessage } from "@/types/rag";
import { askQuestion } from "@/lib/api";
import { ChatMessageList } from "@/components/rag/chat-message-list";
import { ChatInput } from "@/components/rag/chat-input";
import { ChatHeader } from "@/components/rag/chat-header";
import { WelcomeScreen } from "@/components/rag/welcome-screen";
import { KnowledgePanel } from "@/components/rag/knowledge-panel";

function generateId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function Home() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isPending, setIsPending] = React.useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const showWelcome = messages.length === 0;

  // Ikuti konten yang bertambah (typewriter, sumber) selama pengguna masih di dasar.
  React.useEffect(() => {
    const scroller = scrollRef.current;
    const content = scroller?.firstElementChild;
    if (!scroller || !content) return;
    const ro = new ResizeObserver(() => {
      const nearBottom =
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 160;
      if (nearBottom) scroller.scrollTo({ top: scroller.scrollHeight });
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [showWelcome]);

  async function handleSubmit(question: string, displayText?: string) {
    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: displayText ?? question,
      timestamp: new Date(),
    };
    const loadingId = generateId();
    const loadingMsg: ChatMessage = {
      id: loadingId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsPending(true);
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    );

    try {
      const res = await askQuestion({ question });
      const answer: ChatMessage = {
        id: loadingId,
        role: "assistant",
        content: res.answer,
        sources: res.sources,
        retrievalMethod: res.retrievalMethod,
        latencyMs: res.latencyMs,
        timestamp: new Date(),
      };
      setMessages((prev) => prev.map((m) => (m.id === loadingId ? answer : m)));
    } catch (err) {
      const failed: ChatMessage = {
        id: loadingId,
        role: "assistant",
        content: err instanceof Error ? err.message : "Tidak dapat menghubungi backend.",
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => prev.map((m) => (m.id === loadingId ? failed : m)));
    } finally {
      setIsPending(false);
    }
  }

  // Kirim ulang pertanyaan terakhir: buang pasangan tanya-jawab terakhir lalu tanya lagi.
  function handleRegenerate() {
    if (isPending) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((prev) => prev.slice(0, -2));
    handleSubmit(lastUser.content);
  }

  // Pertanyaan lanjutan membawa konteks pertanyaan sebelumnya ke pencarian.
  function handleFollowUp(text: string) {
    if (isPending) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    handleSubmit(lastUser ? `${text} (mengenai: ${lastUser.content})` : text, text);
  }

  return (
    <div className="flex h-screen flex-col">
      <ChatHeader
       messageCount={messages.length}
       onClearChat={() => setMessages([])}
       onOpenKnowledge={() => setKnowledgeOpen(true)}
    />

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="min-h-full">
          {showWelcome ? (
            <WelcomeScreen onExampleClick={(q) => handleSubmit(q)} />
          ) : (
            <ChatMessageList
              messages={messages}
              onRegenerate={handleRegenerate}
              onFollowUp={handleFollowUp}
            />
          )}
        </div>
      </div>

      <ChatInput onSubmit={(q) => handleSubmit(q)} isPending={isPending} />
        <KnowledgePanel
         open={knowledgeOpen}
         onClose={() => setKnowledgeOpen(false)}
         onAsk={(q) => handleSubmit(q)}
     />
    </div>
  );
}
