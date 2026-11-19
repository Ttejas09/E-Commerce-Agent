// ProductCard — Linear/Vercel-inspired product card with rank badges & skeleton loading
import type { ProductSummary } from "../types/api";

interface ProductCardProps {
  product: ProductSummary;
  isCommitted?: boolean;
  isFinal?: boolean;
  rank?: number;
  highlightMatch?: boolean;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  "running shoes": "🏃",
  sneakers: "👟",
  sandals: "🩴",
  "t-shirts": "👕",
  shirts: "👔",
  hoodies: "🧥",
  jackets: "🧥",
  "track pants": "🏋️",
  jeans: "👖",
  kurtas: "🪷",
  dresses: "👗",
  caps: "🧢",
  backpacks: "🎒",
  wallets: "👛",
  watches: "⌚",
  headphones: "🎧",
};

const COLOR_MAP: Record<string, string> = {
  black: "#18181b",
  white: "#f4f4f5",
  navy: "#1e3a8a",
  blue: "#2563eb",
  grey: "#71717a",
  green: "#16a34a",
  red: "#dc2626",
  brown: "#78350f",
  beige: "#d4b996",
  olive: "#556b2f",
  maroon: "#881337",
  pink: "#ec4899",
  tan: "#d2b48c",
  yellow: "#eab308",
  gold: "#d97706",
  silver: "#94a3b8",
};

export function ProductCard({
  product,
  isCommitted = false,
  isFinal = false,
  rank,
  highlightMatch = false,
}: ProductCardProps) {
  const emoji = CATEGORY_EMOJIS[product.category] || "📦";
  const colorHex = COLOR_MAP[product.colour.toLowerCase()] || product.colour;

  return (
    <div
      className={`store-card ${isCommitted ? "store-card--committed" : ""} ${isFinal ? "store-card--final" : ""} ${highlightMatch ? "store-card--highlight" : ""}`}
    >
      {/* Top badges */}
      <div className="store-card__badges">
        {rank !== undefined && (
          <span className="rank-badge">#{rank}</span>
        )}
        {isFinal ? (
          <span className="decision-badge decision-badge--final">
            🎯 Final Recommendation
          </span>
        ) : isCommitted ? (
          <span className="decision-badge decision-badge--committed">
            ⚡ Speculative Commit
          </span>
        ) : null}
      </div>

      {/* Visual illustration / header */}
      <div className="store-card__header">
        <div className="store-card__icon-box">
          <span className="store-card__emoji">{emoji}</span>
        </div>
        <div className="store-card__id-meta">
          <span className="sku-id">{product.product_id}</span>
          <span className="category-tag">{product.category}</span>
        </div>
      </div>

      {/* Title & Brand */}
      <div className="store-card__info">
        <span className="brand-name">{product.brand}</span>
        <h3 className="product-title" title={product.title}>
          {product.title}
        </h3>
      </div>

      {/* Specification pills */}
      <div className="store-card__specs">
        <div className="spec-pill" title={`Colour: ${product.colour}`}>
          <span
            className="colour-indicator"
            style={{
              backgroundColor: colorHex,
              border: product.colour.toLowerCase() === "white" ? "1px solid #71717a" : "none",
            }}
          />
          <span className="spec-pill__text">{product.colour}</span>
        </div>

        {product.size && (
          <div className="spec-pill" title={`Size: ${product.size}`}>
            <span className="spec-pill__dim">Size</span>
            <span className="spec-pill__text">{product.size}</span>
          </div>
        )}
      </div>

      {/* Price row */}
      <div className="store-card__footer">
        <div className="price-block">
          <span className="price-currency">₹</span>
          <span className="price-amount">{product.price.toLocaleString("en-IN")}</span>
        </div>
        {(isCommitted || isFinal) && (
          <span className="match-confidence-tag">
            {isFinal ? "100% Match" : "Gate Passed"}
          </span>
        )}
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="store-card store-card--skeleton">
      <div className="skeleton-bar skeleton-bar--short" />
      <div className="skeleton-box" />
      <div className="skeleton-bar skeleton-bar--medium" />
      <div className="skeleton-bar skeleton-bar--long" />
      <div className="skeleton-specs">
        <div className="skeleton-pill" />
        <div className="skeleton-pill" />
      </div>
      <div className="skeleton-bar skeleton-bar--short" />
    </div>
  );
}
