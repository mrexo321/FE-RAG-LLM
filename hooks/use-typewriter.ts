"use client";

import * as React from "react";

/**
 * Hook that reveals text progressively, word-by-word, to create a
 * typewriter-like streaming effect. Once the full text has been revealed
 * it marks itself as `done` so downstream components (e.g. source panel)
 * can start their own entrance animations.
 */
export function useTypewriter(
  text: string,
  /** Words revealed per tick */
  speed: number = 3,
  /** Milliseconds between ticks */
  interval: number = 120,
  /** Set false to skip the effect and show full text immediately */
  enabled: boolean = true
) {
  const [visibleCount, setVisibleCount] = React.useState(
    enabled ? 0 : Infinity
  );
  const words = React.useMemo(() => text.split(/(\s+)/), [text]);
  const totalTokens = words.length;

  const isDone = visibleCount >= totalTokens;

  React.useEffect(() => {
    if (!enabled) {
      setVisibleCount(Infinity);
      return;
    }

    // Reset when text changes
    setVisibleCount(0);

    const timer = setInterval(() => {
      setVisibleCount((prev) => {
        const next = prev + speed;
        if (next >= totalTokens) {
          clearInterval(timer);
          return totalTokens;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [text, speed, interval, enabled, totalTokens]);

  const visibleText = isDone
    ? text
    : words.slice(0, visibleCount).join("");

  return { visibleText, isDone };
}
