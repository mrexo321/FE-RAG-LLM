"use client";

import * as React from "react";

interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  toast: (message: string, type?: ToastItem["type"]) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback(
    (message: string, type: ToastItem["type"] = "info") => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setItems((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2 sm:bottom-6"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`animate-slide-up rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur-md ${
              item.type === "success"
                ? "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/15 text-foreground"
                : item.type === "error"
                ? "border-destructive/30 bg-destructive/15 text-foreground"
                : "border-border bg-card/90 text-foreground"
            }`}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
