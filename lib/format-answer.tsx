import * as React from "react";

/**
 * Render ringan untuk jawaban LLM: paragraf, daftar (- / 1.) dan **bold**,
 * tanpa dependency markdown penuh.
 */
export function formatAnswer(text: string): React.ReactNode {
  const blocks = text.split(/\n{2,}/);

  return blocks.map((block, bIdx) => {
    const lines = block.split("\n").filter((l) => l.trim().length > 0);
    const isBullet = lines.length > 0 && lines.every((l) => /^\s*[-*•]\s+/.test(l));
    const isOrdered = lines.length > 0 && lines.every((l) => /^\s*\d+[.)]\s+/.test(l));

    if (isBullet || isOrdered) {
      const Tag = isOrdered ? "ol" : "ul";
      return (
        <Tag
          key={bIdx}
          className={`mb-3 space-y-1.5 pl-5 last:mb-0 ${
            isOrdered ? "list-decimal" : "list-disc"
          } marker:text-primary`}
        >
          {lines.map((l, i) => (
            <li key={i}>{renderInline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""))}</li>
          ))}
        </Tag>
      );
    }

    return (
      <p key={bIdx} className="mb-3 last:mb-0">
        {lines.map((line, lIdx) => (
          <React.Fragment key={lIdx}>
            {renderInline(line)}
            {lIdx < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

function renderInline(line: string): React.ReactNode {
  return line
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, idx) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={idx} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <React.Fragment key={idx}>{part}</React.Fragment>
      )
    );
}
