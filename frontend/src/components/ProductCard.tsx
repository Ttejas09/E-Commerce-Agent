// ProductCard — "The Pick"
// Warm studio product card with color tile, category silhouette, committed stamp & revised comparisons
// Supports 'hero' (full vertical card), 'row' (compact horizontal list item for speculative candidates), and 'compact' (side-by-side)

import { motion } from "framer-motion";
import type { ProductSummary } from "../types/api";
import { CATALOGUE_COLOURS } from "../tokens/theme";
import { ProductSilhouette } from "./ProductSilhouette";
import { CommittedStamp } from "./CommittedStamp";

interface ProductCardProps {
  product: ProductSummary;
  isCommitted?: boolean;
  isFinal?: boolean;
  isRevised?: boolean;
  rank?: number;
  compact?: boolean;
  variant?: "hero" | "row" | "compact";
}

export function ProductCard({
  product,
  isCommitted = false,
  isFinal = false,
  isRevised = false,
  rank,
  compact = false,
  variant = "hero",
}: ProductCardProps) {
  const normColour = product.colour.toLowerCase().trim();
  const swatch = CATALOGUE_COLOURS[normColour] || { hex: "#78716C", isLight: false };

  // Horizontal row layout for speculative candidate matches
  if (variant === "row") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="relative flex flex-row items-center gap-3 p-2.5 sm:p-3 rounded-xl border border-hairline bg-card hover:border-terracotta/40 hover:shadow-2xs transition-all group shrink-0"
      >
        {/* Left Thumbnail Tile */}
        <div
          className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 rounded-lg overflow-hidden flex items-center justify-center transition-transform group-hover:scale-[1.03]"
          style={{ backgroundColor: swatch.hex }}
        >
          <ProductSilhouette
            category={product.category}
            isLightBackground={swatch.isLight}
            className="w-8 h-8 sm:w-9 sm:h-9"
          />

          {/* Rank tag */}
          {rank !== undefined && (
            <span
              className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold leading-none shadow-2xs"
              style={{
                backgroundColor: swatch.isLight ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.3)",
                color: swatch.isLight ? "#1E1A16" : "#FFFDF8",
              }}
            >
              #{rank}
            </span>
          )}
        </div>

        {/* Right Info Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-terracotta truncate">
              {product.brand}
            </span>
            <span className="font-mono font-bold text-ink text-sm shrink-0">
              ₹{product.price.toLocaleString("en-IN")}
            </span>
          </div>

          <h4
            className="font-serif font-semibold text-ink leading-snug text-xs sm:text-sm truncate mt-0.5"
            title={product.title}
          >
            {product.title}
          </h4>

          <div className="flex items-center justify-between gap-1 mt-1.5 text-[11px] text-mutedInk">
            <div className="flex items-center gap-1.5 truncate">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-hairline bg-paper text-[10px]">
                <span
                  className="w-1.5 h-1.5 rounded-full border border-black/10 shrink-0"
                  style={{ backgroundColor: swatch.hex }}
                />
                <span className="truncate">{product.colour}</span>
              </span>
              {product.size && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full border border-hairline bg-paper text-[10px] font-mono shrink-0">
                  Size {product.size}
                </span>
              )}
            </div>
            <span className="text-[9px] font-mono opacity-50 shrink-0">
              {product.product_id}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Hero or Compact Vertical Card (Committed / Final / Comparison)
  const isCompactMode = compact || variant === "compact";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className={`relative flex flex-col rounded-2xl border transition-all ${
        isFinal
          ? "border-commitGreen/40 bg-card shadow-md ring-1 ring-commitGreen/20"
          : isCommitted
            ? "border-commitGreen/30 bg-card shadow-sm"
            : isRevised
              ? "border-warningRose/30 bg-card/80 opacity-90"
              : "border-hairline bg-card hover:border-hairline/80 hover:shadow-xs"
      } ${isCompactMode ? "p-3" : "p-4"}`}
    >
      {/* Committed Stamp Overlay */}
      {isCommitted && !isRevised && (
        <div className="absolute -top-3 -right-3 z-20 pointer-events-none">
          <CommittedStamp size={isCompactMode ? 56 : 72} />
        </div>
      )}

      {/* Revised Banner */}
      {isRevised && (
        <div className="mb-2 inline-flex items-center gap-1 text-[11px] font-mono text-warningRose font-semibold">
          <span>Struck out after final words</span>
        </div>
      )}

      {/* Visual Tile + Category Silhouette */}
      <div
        className={`relative w-full rounded-xl overflow-hidden flex items-center justify-center transition-transform ${
          isCompactMode ? "h-24 mb-2.5" : "h-36 mb-3.5"
        }`}
        style={{ backgroundColor: swatch.hex }}
      >
        <ProductSilhouette
          category={product.category}
          isLightBackground={swatch.isLight}
          className={isCompactMode ? "w-12 h-12" : "w-20 h-20"}
        />

        {/* Small rank tag */}
        {rank !== undefined && (
          <span
            className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold"
            style={{
              backgroundColor: swatch.isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)",
              color: swatch.isLight ? "#1E1A16" : "#FFFDF8",
            }}
          >
            #{rank}
          </span>
        )}

        {/* Product SKU ID */}
        <span
          className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono"
          style={{
            backgroundColor: swatch.isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)",
            color: swatch.isLight ? "#1E1A16" : "#FFFDF8",
          }}
        >
          {product.product_id}
        </span>
      </div>

      {/* Product Information */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-terracotta">
            {product.brand}
          </span>
          <span className="text-[11px] text-mutedInk capitalize">
            {product.category}
          </span>
        </div>

        <h3
          className={`font-serif font-semibold text-ink leading-snug line-clamp-2 ${
            isCompactMode ? "text-sm" : "text-base"
          }`}
          title={product.title}
        >
          {product.title}
        </h3>

        {/* Meta badges: Colour & Size */}
        <div className="flex items-center gap-1.5 mt-1 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-hairline bg-paper text-mutedInk text-[11px]">
            <span
              className="w-2 h-2 rounded-full border border-black/10"
              style={{ backgroundColor: swatch.hex }}
            />
            {product.colour}
          </span>
          {product.size && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-hairline bg-paper text-mutedInk text-[11px] font-mono">
              Size {product.size}
            </span>
          )}
        </div>

        {/* Price Row */}
        <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-hairline">
          <span className="font-mono text-xs text-mutedInk">Price</span>
          <span className="font-mono font-bold text-ink text-base">
            ₹{product.price.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function ProductCardSkeleton({
  compact = false,
  variant = "hero",
}: {
  compact?: boolean;
  variant?: "hero" | "row";
}) {
  if (variant === "row") {
    return (
      <div className="rounded-xl border border-hairline bg-card/60 animate-pulse flex flex-row items-center gap-3 p-2.5 sm:p-3 shrink-0">
        <div className="w-16 h-16 sm:w-18 sm:h-18 shrink-0 rounded-lg bg-hairline/70" />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="h-2.5 w-16 bg-hairline rounded" />
            <div className="h-3.5 w-12 bg-hairline rounded" />
          </div>
          <div className="h-3.5 w-4/5 bg-hairline rounded" />
          <div className="flex gap-1.5">
            <div className="h-3 w-12 bg-hairline rounded-full" />
            <div className="h-3 w-10 bg-hairline rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-hairline bg-card/60 animate-pulse flex flex-col gap-2.5 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className={`w-full rounded-xl bg-hairline/70 ${compact ? "h-24" : "h-36"}`} />
      <div className="h-3 w-1/3 bg-hairline rounded" />
      <div className="h-4 w-4/5 bg-hairline rounded" />
      <div className="flex gap-2">
        <div className="h-4 w-12 bg-hairline rounded-full" />
        <div className="h-4 w-12 bg-hairline rounded-full" />
      </div>
      <div className="h-4 w-1/4 bg-hairline rounded self-end mt-2" />
    </div>
  );
}
