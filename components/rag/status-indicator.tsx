"use client";

import { useHealth } from "@/hooks/use-health";

export function StatusIndicator() {
  const { data, isError, isLoading } = useHealth();

  const state = isLoading ? "loading" : isError ? "down" : "up";

  const label =
    state === "loading"
      ? "Menghubungi…"
      : state === "down"
      ? "Offline"
      : "Online";

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          state === "up"
            ? "bg-[hsl(var(--success))]"
            : state === "down"
            ? "bg-[hsl(0,84%,60%)]"
            : "bg-destructive"
        }`}
      />
      {label}
    </div>
  );
}
