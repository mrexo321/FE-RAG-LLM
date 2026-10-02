"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  MessageSquareText,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import { getCorpus } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { StatusIndicator } from "@/components/rag/status-indicator";
import { ThemeToggle } from "@/components/rag/theme-toggle";
import { useChat } from "@/components/chat/chat-provider";

const NAV_ITEMS = [
  { href: "/", label: "Tanya AI", icon: MessageSquareText },
  { href: "/dokumen", label: "Dokumen", icon: FileText },
  { href: "/unggah", label: "Unggah", icon: UploadCloud },
] as const;

export function AppHeader() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { messages, clearChat } = useChat();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function handlePrefetch() {
    queryClient.prefetchQuery({
      queryKey: queryKeys.corpus,
      queryFn: getCorpus,
    });
  }

  return (
    <>
      {/* ── Desktop / tablet header ────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-[hsl(var(--header-bg))] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          {/* Logo + status */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold text-foreground">
                Regulasi POJK
              </h1>
              <StatusIndicator />
            </div>
          </div>

          {/* Nav tabs (hidden on mobile, visible sm+) */}
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Navigasi utama">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onMouseEnter={href === "/dokumen" ? handlePrefetch : undefined}
                  onFocus={href === "/dokumen" ? handlePrefetch : undefined}
                  className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[calc(0.5rem+1px)] h-0.5 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className={`${messages.length > 0 && pathname === "/" ? "flex" : "invisible" } h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                Percakapan baru
              </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Mobile bottom tab bar (visible < sm) ───────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-[hsl(var(--header-bg))] backdrop-blur-md sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Navigasi utama"
      >
        <div className="grid grid-cols-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onMouseEnter={href === "/dokumen" ? handlePrefetch : undefined}
                onFocus={href === "/dokumen" ? handlePrefetch : undefined}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
