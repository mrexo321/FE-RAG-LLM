"use client";

import type { ChatMessage } from "@/types/rag";
import { ChatBubble } from "@/components/rag/chat-bubble";

interface ChatMessageListProps {
  messages: ChatMessage[];
  onRegenerate: () => void;
  onFollowUp: (text: string) => void;
}

export function ChatMessageList({ messages, onRegenerate, onFollowUp }: ChatMessageListProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      {messages.map((message, idx) => (
        <ChatBubble
          key={message.id}
          message={message}
          isLast={idx === messages.length - 1}
          onRegenerate={onRegenerate}
          onFollowUp={onFollowUp}
        />
      ))}
    </div>
  );
}
