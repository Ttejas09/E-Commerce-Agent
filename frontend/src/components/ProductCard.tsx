// ProductCard — "The Pick"
// Warm studio product card with color tile, category silhouette, committed stamp & revised comparisons

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
}

export function ProductCard({
  product,
  isCommitted = false,
  isFinal = false,
  isRevised = false,
  rank,
  compact = false,
}: ProductCardProps) {
  const normColour = product.colour.toLowerCase().trim();
  const swatch = CATALOGUE_COLOURS[normColour] || { hex: "#78716C", isLight: false };

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
      } ${compact ? "p-3" : "p-4"}`}
    >
      {/* Committed Stamp Overlay */}
      {isCommitted && !isRevised && (
        <div className="absolute -top-3 -right-3 z-20 pointer-events-none">
          <CommittedStamp size={compact ? 56 : 72} />
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
          compact ? "h-24 mb-2.5" : "h-36 mb-3.5"
        }`}
        style={{ backgroundColor: swatch.hex }}
      >
        <ProductSilhouette
          category={product.category}
          isLightBackground={swatch.isLight}
          className={compact ? "w-12 h-12" : "w-20 h-20"}
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
            compact ? "text-sm" : "text-base"
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

export function ProductCardSkeleton({ compact = false }: { compact?: boolean }) {
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
