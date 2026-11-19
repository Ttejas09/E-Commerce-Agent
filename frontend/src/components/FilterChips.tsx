// FilterChips — animated, color-coded chips with version badge and update pulse
import { useEffect, useRef, useState } from "react";
import type { FilterState, FilterValue } from "../types/api";

interface FilterChipsProps {
  filters: FilterState;
}

const SLOT_META: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  category: { label: "Category", icon: "🏷️", color: "#8b5cf6" },
  brand: { label: "Brand", icon: "✨", color: "#6366f1" },
  colour: { label: "Colour", icon: "🎨", color: "#3b82f6" },
  size: { label: "Size", icon: "📐", color: "#10b981" },
  max_price: { label: "Max Budget", icon: "💰", color: "#f59e0b" },
  min_price: { label: "Min Budget", icon: "💸", color: "#ec4899" },
};

function formatValue(key: string, fv: FilterValue): string {
  if (key === "max_price" || key === "min_price") {
    return `₹${Number(fv.value).toLocaleString("en-IN")}`;
  }
  return String(fv.value);
}

export function FilterChips({ filters }: FilterChipsProps) {
  const [pulseSlots, setPulseSlots] = useState<Set<string>>(new Set());
  const prevFiltersRef = useRef<FilterState>(filters);

  // Detect which slot changed to trigger subtle flash animation
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const changed = new Set<string>();

    for (const key of [
      "category",
      "colour",
      "size",
      "brand",
      "max_price",
      "min_price",
    ] as const) {
      const prevVal = prev[key]?.value;
      const currVal = filters[key]?.value;
      if (currVal !== undefined && currVal !== prevVal) {
        changed.add(key);
      }
    }

    if (changed.size > 0) {
      setPulseSlots(changed);
      const timer = setTimeout(() => setPulseSlots(new Set()), 1200);
      return () => clearTimeout(timer);
    }
    prevFiltersRef.current = filters;
  }, [filters]);

  const activeSlots = (
    ["category", "brand", "colour", "size", "max_price", "min_price"] as const
  ).filter((k) => filters[k] !== null);

  const hasResidual = filters.residual_tokens.length > 0;

  return (
    <div className="filter-panel">
      <div className="filter-panel__header">
        <div className="filter-panel__title-row">
          <span className="filter-panel__title">EXTRACTED FILTERS</span>
          <span
            className={`version-badge ${filters.version > 0 ? "version-badge--updated" : ""}`}
            title={`Filter State Version: ${filters.version}`}
          >
            V{filters.version}
          </span>
        </div>
        <span className="filter-panel__count">
          {activeSlots.length} {activeSlots.length === 1 ? "slot" : "slots"} set
        </span>
      </div>

      <div className="filter-chips-grid">
        {activeSlots.length === 0 && !hasResidual ? (
          <div className="filter-chips-empty">
            <span className="empty-dash">—</span>
            <span>No attributes extracted yet</span>
          </div>
        ) : (
          <>
            {activeSlots.map((key) => {
              const fv = filters[key] as FilterValue;
              const meta = SLOT_META[key];
              const isPulsing = pulseSlots.has(key);
              const provenanceStr = fv.provenance.join(" ");
              const hasTransformation =
                provenanceStr &&
                provenanceStr.toLowerCase() !== String(fv.value).toLowerCase();

              return (
                <div
                  key={key}
                  className={`filter-chip ${isPulsing ? "filter-chip--pulsing" : ""}`}
                  style={{
                    borderColor: `${meta.color}40`,
                    background: `linear-gradient(135deg, rgba(17, 19, 24, 0.9), ${meta.color}10)`,
                  }}
                  title={`Slot: ${meta.label}\nValue: ${fv.value}\nConfidence: ${(fv.confidence * 100).toFixed(0)}%\nSource text: "${provenanceStr}"`}
                >
                  <span className="filter-chip__icon">{meta.icon}</span>
                  <div className="filter-chip__content">
                    <span className="filter-chip__label" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    <div className="filter-chip__value-row">
                      <span className="filter-chip__value">
                        {formatValue(key, fv)}
                      </span>
                      {hasTransformation && (
                        <span className="filter-chip__provenance" title="Source phrase">
                          ← {provenanceStr}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="filter-chip__conf">
                    {(fv.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}

            {hasResidual && (
              <div
                className="filter-chip filter-chip--residual"
                title="Non-slot descriptive keywords forwarded to query ranking"
              >
                <span className="filter-chip__icon">🔍</span>
                <div className="filter-chip__content">
                  <span className="filter-chip__label">Query Keywords</span>
                  <span className="filter-chip__value">
                    {filters.residual_tokens.join(" ")}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
