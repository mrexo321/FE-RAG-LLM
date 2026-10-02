"use client";

import { Library, ShieldCheck, SquarePen } from "lucide-react";
import { StatusIndicator } from "@/components/rag/status-indicator";
import { ThemeToggle } from "@/components/rag/theme-toggle";

interface ChatHeaderProps {
  messageCount: number;
  onClearChat: () => void;
  onOpenKnowledge: () => void;
}

export function ChatHeader({ messageCount, onClearChat, onOpenKnowledge }: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-[hsl(var(--header-bg))] backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold text-foreground">
              Regulasi POJK
            </h1>
            <StatusIndicator />
          </div>
        </div>

        <div className="flex items-center gap-2">
<button
  onClick={onOpenKnowledge}
  className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
  <Library className="h-3.5 w-3.5" aria-hidden />
  <span className="hidden sm:inline">Kamus Data</span>
        </button>
          {messageCount > 0 && (
            <button
              onClick={onClearChat}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SquarePen className="h-3.5 w-3.5" aria-hidden />
                <span>Percakapan baru</span>
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
