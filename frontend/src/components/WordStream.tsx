// WordStream — shows the incoming words with highlighting for recognized slots
import type { FilterState } from "../types/api";

interface WordStreamProps {
  words: string[];
  filters: FilterState;
  interim?: string; // voice interim text
}

export function WordStream({ words, filters, interim }: WordStreamProps) {
  // Build a set of provenance words for highlighting
  const slotWords = new Set<string>();
  for (const key of [
    "category",
    "colour",
    "size",
    "brand",
    "max_price",
    "min_price",
  ] as const) {
    const fv = filters[key];
    if (fv) {
      for (const p of fv.provenance) {
        slotWords.add(p.toLowerCase());
      }
    }
  }

  return (
    <div className="word-stream">
      <div className="word-stream__words">
        {words.map((word, i) => {
          const clean = word.toLowerCase().replace(/[,.\-!?;:'"]/g, "");
          const isSlot = slotWords.has(clean);
          return (
            <span
              key={i}
              className={`word-token ${isSlot ? "word-token--slot" : ""}`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {word}
            </span>
          );
        })}
        {interim && (
          <span className="word-token word-token--interim">{interim}</span>
        )}
        {words.length > 0 && (
          <span className="word-stream__cursor" />
        )}
      </div>
      {words.length === 0 && (
        <span className="word-stream__placeholder">
          Type or speak your shopping request...
        </span>
      )}
    </div>
  );
}
