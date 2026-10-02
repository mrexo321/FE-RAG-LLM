import * as React from "react";

/**
 * Custom hook untuk menghaluskan animasi streaming teks ala Claude AI
 * @param targetText Teks lengkap/parsial yang diterima dari SSE/Stream
 * @param isStreaming Status apakah API masih dalam proses streaming
 * @param speed Kecepatan karakter per tick (default: 2 karkater)
 */
export function useSmoothText(targetText: string, isStreaming: boolean, speed = 2) {
  const [displayedText, setDisplayedText] = React.useState(targetText);
  const targetRef = React.useRef(targetText);
  const displayedRef = React.useRef(displayedText);
  const animFrameRef = React.useRef<number | null>(null);

  targetRef.current = targetText;
  displayedRef.current = displayedText;

  React.useEffect(() => {
    // Jika streaming selesai atau tidak aktif, langsung selaraskan teks
    if (!isStreaming) {
      setDisplayedText(targetText);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const updateText = () => {
      const target = targetRef.current;
      const current = displayedRef.current;

      if (current.length < target.length) {
        // Hitung berapa karakter yang perlu ditambahkan dalam tick ini (interp)
        const diff = target.length - current.length;
        // Jika tertinggal jauh, naikkan kecepatan pengetikan secara dinamis
        const step = Math.max(speed, Math.ceil(diff / 4));
        const nextText = target.slice(0, current.length + step);

        setDisplayedText(nextText);
        displayedRef.current = nextText;

        animFrameRef.current = requestAnimationFrame(updateText);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateText);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetText, isStreaming, speed]);

  return displayedText;
}
