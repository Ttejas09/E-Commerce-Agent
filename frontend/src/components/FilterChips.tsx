// FilterChips — "What I understood"
// Pops in with spring animation, shows provenance tooltip, ghost chip for superseded values, dotted placeholders for empty slots

import { motion, AnimatePresence } from "framer-motion";
import type { FilterState, FilterValue } from "../types/api";
import { SLOT_ACCENTS } from "../tokens/theme";

export interface GhostFilterItem {
  slot: string;
  value: string | number;
}

interface FilterChipsProps {
  filters: FilterState;
  ghostFilters?: GhostFilterItem[];
}

const REQUIRED_SLOTS = [
  { key: "category", label: "Category", placeholder: "Any category" },
  { key: "brand", label: "Brand", placeholder: "Any brand" },
  { key: "colour", label: "Colour", placeholder: "Any colour" },
  { key: "size", label: "Size", placeholder: "Any size" },
  { key: "max_price", label: "Max Budget", placeholder: "No limit" },
  { key: "min_price", label: "Min Price", placeholder: "No minimum" },
] as const;

function formatFilterDisplay(key: string, val: string | number): string {
  if (key === "max_price" || key === "min_price") {
    return `₹${Number(val).toLocaleString("en-IN")}`;
  }
  return String(val);
}

export function FilterChips({ filters, ghostFilters = [] }: FilterChipsProps) {
  // Find ghost filters by slot
  const ghostMap = new Map<string, string | number>();
  for (const g of ghostFilters) {
    ghostMap.set(g.slot, g.value);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-mutedInk">
          What I understood
        </span>
        <span className="font-mono text-[11px] text-mutedInk bg-hairline/60 px-1.5 py-0.5 rounded">
          v{filters.version}
        </span>
      </div>

      {/* Grid of structured slots */}
      <div className="grid grid-cols-2 gap-2.5">
        {REQUIRED_SLOTS.map(({ key, label, placeholder }) => {
          const fv = filters[key as keyof FilterState] as FilterValue | null;
          const ghostVal = ghostMap.get(key);
          const accent = SLOT_ACCENTS[key] || {
            label,
            lightBg: "#F0EAE1",
            text: "#6B4E3D",
            border: "#D8CEBF",
          };

          return (
            <div
              key={key}
              className="flex flex-col gap-1 p-2.5 rounded-xl border border-hairline bg-card transition-all"
            >
              <div className="flex items-center justify-between text-[11px] text-mutedInk">
                <span className="font-mono uppercase text-[10px] tracking-wider">
                  {label}
                </span>
                {fv && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: accent.text }}
                    title={`Confidence: ${(fv.confidence * 100).toFixed(0)}%`}
                  />
                )}
              </div>

              <div className="flex items-center gap-1.5 min-h-[28px] flex-wrap">
                {/* Ghost Chip (Superseded value) */}
                <AnimatePresence>
                  {ghostVal !== undefined && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 0.5, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs line-through text-warningRose border border-warningRose/30 bg-warningRose/5 font-medium"
                      title="Previously mentioned, now changed"
                    >
                      {formatFilterDisplay(key, ghostVal)}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Active Pop-in Chip */}
                <AnimatePresence mode="wait">
                  {fv ? (
                    <motion.div
                      key={`${key}-${fv.value}`}
                      initial={{ scale: 0.8, opacity: 0, y: 4 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 450, damping: 25 }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold shadow-xs"
                      style={{
                        backgroundColor: accent.lightBg,
                        color: accent.text,
                        border: `1px solid ${accent.border}`,
                      }}
                      title={`Extracted from: "${fv.provenance.join(" ")}"\nConfidence: ${(fv.confidence * 100).toFixed(0)}%`}
                    >
                      <span>{formatFilterDisplay(key, fv.value)}</span>
                      {fv.provenance.length > 0 &&
                        fv.provenance.join(" ").toLowerCase() !==
                          String(fv.value).toLowerCase() && (
                          <span className="text-[10px] opacity-70 font-normal">
                            ← {fv.provenance.join(" ")}
                          </span>
                        )}
                    </motion.div>
                  ) : (
                    /* Dotted Empty Placeholder */
                    <span className="text-xs text-mutedInk/60 border border-dashed border-hairline px-2 py-0.5 rounded-lg italic">
                      {placeholder}
                    </span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Residual / Vibe tokens */}
      {filters.residual_tokens && filters.residual_tokens.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-mutedInk">
            Descriptor Vibes (Title & Description overlap)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {filters.residual_tokens.map((vibe, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-paper border border-hairline text-mutedInk font-sans"
              >
                ~ {vibe}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
