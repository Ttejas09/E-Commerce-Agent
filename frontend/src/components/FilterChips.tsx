// FilterChips — shows extracted filter slots as animated chips
import type { FilterState, FilterValue } from "../types/api";

interface FilterChipsProps {
  filters: FilterState;
}

const SLOT_LABELS: Record<string, string> = {
  category: "Category",
  colour: "Colour",
  size: "Size",
  brand: "Brand",
  max_price: "Max Price",
  min_price: "Min Price",
};

const SLOT_ICONS: Record<string, string> = {
  category: "🏷️",
  colour: "🎨",
  size: "📐",
  brand: "✨",
  max_price: "💰",
  min_price: "💸",
};

function formatValue(key: string, fv: FilterValue): string {
  if (key === "max_price" || key === "min_price") {
    return `₹${Number(fv.value).toLocaleString("en-IN")}`;
  }
  return String(fv.value);
}

export function FilterChips({ filters }: FilterChipsProps) {
  const slots = (
    ["category", "colour", "size", "brand", "max_price", "min_price"] as const
  ).filter((k) => filters[k] !== null);

  if (slots.length === 0 && filters.residual_tokens.length === 0) {
    return (
      <div className="filter-chips filter-chips--empty">
        <span className="filter-chips__placeholder">
          Waiting for filters...
        </span>
      </div>
    );
  }

  return (
    <div className="filter-chips">
      {slots.map((key) => {
        const fv = filters[key] as FilterValue;
        return (
          <div
            key={key}
            className="filter-chip"
            style={{
              opacity: fv.confidence,
              animationDelay: `${fv.word_index * 40}ms`,
            }}
            title={`Confidence: ${(fv.confidence * 100).toFixed(0)}% | Word #${fv.word_index}\nSource: ${fv.provenance.join(", ")}`}
          >
            <span className="filter-chip__icon">{SLOT_ICONS[key]}</span>
            <span className="filter-chip__label">{SLOT_LABELS[key]}</span>
            <span className="filter-chip__value">{formatValue(key, fv)}</span>
            <span className="filter-chip__confidence">
              {(fv.confidence * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
      {filters.residual_tokens.length > 0 && (
        <div className="filter-chip filter-chip--residual" title="Residual query tokens for search disambiguation">
          <span className="filter-chip__icon">🔍</span>
          <span className="filter-chip__label">Query</span>
          <span className="filter-chip__value">
            {filters.residual_tokens.join(" ")}
          </span>
        </div>
      )}
    </div>
  );
}
