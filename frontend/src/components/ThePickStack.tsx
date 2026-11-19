// ThePickStack — Zone 3: "The Pick"
// Candidate stack, committed card with stamp & flourish, side-by-side revised comparison after finish

import { motion, AnimatePresence } from "framer-motion";
import type { ProductSummary } from "../types/api";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";

interface ThePickStackProps {
  committedProduct: ProductSummary | null;
  finalProduct: ProductSummary | null;
  topCandidates: ProductSummary[];
  isStreaming: boolean;
  isFinished: boolean;
}

export function ThePickStack({
  committedProduct,
  finalProduct,
  topCandidates,
  isStreaming,
  isFinished,
}: ThePickStackProps) {
  // Check if revised after finish (final product is different from committed product)
  const isRevised =
    isFinished &&
    committedProduct !== null &&
    finalProduct !== null &&
    finalProduct.product_id !== committedProduct.product_id;

  const hasPick = committedProduct !== null || finalProduct !== null;

  return (
    <div className="flex flex-col h-full gap-4 p-6 md:p-8 overflow-y-auto">
      {/* Zone Header */}
      <div className="flex items-center justify-between pb-2 border-b border-hairline">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-mutedInk">
            The Pick
          </span>
          <span className="font-serif italic text-sm text-ink">
            {isRevised
              ? "Revised after your last words"
              : isFinished
                ? "Final Selection"
                : committedProduct
                  ? "Locked in early"
                  : "Scanning catalogue"}
          </span>
        </div>

        {hasPick && !isRevised && (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-commitGreen font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-commitGreen" />
            Decision
          </span>
        )}
      </div>

      {/* Case A: Revised at finish — Show BOTH cards side by side */}
      <AnimatePresence mode="wait">
        {isRevised && committedProduct && finalProduct ? (
          <motion.div
            key="revised-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3"
          >
            <div className="p-3 rounded-xl bg-saffron/10 border border-saffron/30 text-xs text-ink leading-relaxed">
              <span className="font-bold text-terracotta">Note: </span>
              Your final words changed the constraint, so the agent adjusted the answer.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <span className="block font-mono text-[10px] uppercase text-mutedInk mb-1.5">
                  Earlier Speculative Pick
                </span>
                <ProductCard product={committedProduct} isRevised compact />
              </div>
              <div>
                <span className="block font-mono text-[10px] uppercase text-commitGreen font-bold mb-1.5">
                  Final Revised Pick
                </span>
                <ProductCard product={finalProduct} isFinal compact />
              </div>
            </div>
          </motion.div>
        ) : finalProduct ? (
          /* Case B: Final Product Confirmed */
          <motion.div
            key={`final-${finalProduct.product_id}`}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col gap-3"
          >
            <ProductCard product={finalProduct} isFinal />
          </motion.div>
        ) : committedProduct ? (
          /* Case C: Mid-Stream Committed Product */
          <motion.div
            key={`commit-${committedProduct.product_id}`}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="flex flex-col gap-3"
          >
            <ProductCard product={committedProduct} isCommitted />
          </motion.div>
        ) : isStreaming ? (
          /* Case D: Thinking / Searching with candidate skeletons */
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-mutedInk italic">
              <span>Comparing candidate items...</span>
              <span className="font-mono text-[10px]">Filtering</span>
            </div>
            {topCandidates.length > 0 ? (
              <div className="flex flex-col gap-3">
                {topCandidates.slice(0, 2).map((cand, idx) => (
                  <ProductCard key={cand.product_id} product={cand} rank={idx + 1} compact />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <ProductCardSkeleton compact />
                <ProductCardSkeleton compact />
              </div>
            )}
          </div>
        ) : (
          /* Case E: Idle / Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-mutedInk border border-dashed border-hairline rounded-2xl bg-card/40 my-auto">
            <div className="w-12 h-12 rounded-full border border-hairline bg-paper flex items-center justify-center mb-3 text-mutedInk">
              🛍️
            </div>
            <h4 className="font-serif italic text-lg text-ink mb-1">
              No pick yet
            </h4>
            <p className="text-xs text-mutedInk max-w-xs leading-relaxed font-sans">
              As you speak or type, candidates will gather here, and lock into a decision the moment the agent is confident.
            </p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
