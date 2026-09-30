"use client";

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5" aria-label="Sedang mengetik">
      <div className="typing-dot" />
      <div className="typing-dot" />
      <div className="typing-dot" />
    </div>
  );
}
