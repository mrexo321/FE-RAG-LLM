"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown } from "lucide-react";

import { useChat } from "@/components/chat/chat-provider";
import { ChatMessageList } from "@/components/rag/chat-message-list";
import { ChatInput } from "@/components/rag/chat-input";
import { WelcomeScreen } from "@/components/rag/welcome-screen";
import { SourceSidebar, SourceSidebarToggle } from "@/components/rag/source-sidebar";

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    messages,
    isPending,
    handleSubmit,
    handleStop,
    handleRegenerate,
    handleFollowUp,
    isSidebarOpen,
  } = useChat();

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = React.useState(false);
  const showWelcome = messages.length === 0;

  // Auto-submit bila diarahkan dengan parameter query ?q=... (misal dari halaman Dokumen)
  React.useEffect(() => {
    const query = searchParams.get("q");
    if (query && query.trim()) {
      handleSubmit(query.trim());
      router.replace("/", { scroll: false });
    }
  }, [searchParams, handleSubmit, router]);

  // Listener scroll manual untuk menampilkan tombol "Ke jawaban terbaru"
  const handleScroll = React.useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const isNearBottom =
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 160;
    setShowScrollBottom(!isNearBottom);
  }, []);

  // Ikuti konten yang bertambah secara dinamis selama pengguna di dekat bawah scroll
  React.useEffect(() => {
    const scroller = scrollRef.current;
    const content = scroller?.firstElementChild;
    if (!scroller || !content) return;

    const ro = new ResizeObserver(() => {
      const nearBottom =
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 160;
      if (nearBottom) {
        scroller.scrollTo({ top: scroller.scrollHeight });
      }
    });

    ro.observe(content);
    return () => ro.disconnect();
  }, [showWelcome]);

  const scrollToBottom = () => {
    const scroller = scrollRef.current;
    if (scroller) {
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
    }
  };

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)]">
      {/* Area chat utama */}
      <div
        className={`relative flex flex-1 flex-col pb-14 sm:pb-0 transition-all duration-300 ${
          isSidebarOpen ? "lg:mr-0" : ""
        }`}
      >
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
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

        {/* Tombol melayang "Ke jawaban terbaru" jika pengguna scroll ke atas saat streaming */}
        {showScrollBottom && (
          <div className="pointer-events-none absolute bottom-28 left-1/2 z-20 -translate-x-1/2">
            <button
              type="button"
              onClick={scrollToBottom}
              className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur-md transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Gulir ke jawaban terbaru"
            >
              <ArrowDown className="h-3.5 w-3.5 text-primary" />
              <span>Ke jawaban terbaru</span>
            </button>
          </div>
        )}

        <ChatInput
          onSubmit={(q) => handleSubmit(q)}
          onStop={handleStop}
          isPending={isPending}
        />
      </div>

      {/* Toggle tombol saat sidebar tertutup */}
      <SourceSidebarToggle />

      {/* Sidebar sumber rujukan */}
      <SourceSidebar />
    </div>
  );
}

export default function ChatPage() {
  return (
    <React.Suspense fallback={<div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center" />}>
      <ChatContent />
    </React.Suspense>
  );
}
