// StorefrontGrid — Live speculative storefront showing real-time candidate re-ranking & commitments
import type { AgentPhase, FilterState, ProductSummary } from "../types/api";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { MOCK_CATALOGUE } from "../lib/mock";

interface StorefrontGridProps {
  candidates: ProductSummary[];
  committedProduct: ProductSummary | null;
  finalProduct: ProductSummary | null;
  filters: FilterState;
  phase: AgentPhase;
  isSearching?: boolean;
}

export function StorefrontGrid({
  candidates,
  committedProduct,
  finalProduct,
  filters,
  phase,
  isSearching = false,
}: StorefrontGridProps) {
  // Compute display list:
  // 1. If backend returned candidates, use them
  // 2. Otherwise filter catalogue based on active extracted filters so demo looks complete!
  let displayProducts: ProductSummary[] = [];

  if (candidates.length > 0) {
    displayProducts = candidates;
  } else {
    // Filter from full catalogue based on active filters
    displayProducts = MOCK_CATALOGUE.filter((p) => {
      if (filters.category && p.category !== filters.category.value) return false;
      if (filters.colour && p.colour !== filters.colour.value) return false;
      if (filters.brand && p.brand !== filters.brand.value) return false;
      if (filters.size && p.size && p.size !== filters.size.value) return false;
      if (filters.max_price && p.price > Number(filters.max_price.value)) return false;
      if (filters.min_price && p.price < Number(filters.min_price.value)) return false;
      return true;
    });

    // If completely over-constrained and 0 results, show top catalogue items
    if (displayProducts.length === 0) {
      displayProducts = MOCK_CATALOGUE.slice(0, 6);
    }
  }

  // Determine status pill text and color
  const getStatusPill = () => {
    if (finalProduct) {
      return { text: "Finalized Decision", type: "final" };
    }
    if (committedProduct) {
      return { text: "Early Commit Locked", type: "committed" };
    }
    if (isSearching) {
      return { text: "Speculative Search Active", type: "searching" };
    }
    if (displayProducts.length === 1) {
      return { text: "Unique Match Found", type: "match" };
    }
    if (displayProducts.length > 1 && displayProducts.length < MOCK_CATALOGUE.length) {
      return { text: "Speculative Filtering", type: "filtering" };
    }
    return { text: "Awaiting Query Filters", type: "idle" };
  };

  const status = getStatusPill();

  // If a final or committed product exists, prioritize it at the top
  const heroProduct = finalProduct || committedProduct;
  const otherProducts = heroProduct
    ? displayProducts.filter((p) => p.product_id !== heroProduct.product_id)
    : displayProducts;

  return (
    <div className="storefront-pane">
      {/* Storefront Header */}
      <div className="storefront-header">
        <div className="storefront-header__left">
          <div className="storefront-header__title-row">
            <span className="storefront-title">SPECULATIVE STOREFRONT</span>
            <span className="version-pill" title="Filter version">
              v{filters.version}
            </span>
          </div>
          <span className="storefront-subtitle">
            Live catalogue state updated per token
          </span>
        </div>

        <div className="storefront-header__right">
          <span className={`store-status-pill store-status-pill--${status.type}`}>
            <span className="status-dot-sm" />
            {status.text}
          </span>
          <span className="results-counter">
            {displayProducts.length}{" "}
            {displayProducts.length === 1 ? "candidate" : "candidates"}
          </span>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="storefront-body">
        {/* Featured Hero Product Card if committed or final */}
        {heroProduct && (
          <div className="hero-product-section">
            <div className="hero-product-banner">
              <span className="hero-banner-icon">
                {finalProduct ? "🎯" : "⚡"}
              </span>
              <span className="hero-banner-title">
                {finalProduct
                  ? "Optimal Target Product (Finalized)"
                  : "Anticipatory Speculative Commit (Earliest Match)"}
              </span>
            </div>
            <ProductCard
              product={heroProduct}
              isFinal={Boolean(finalProduct)}
              isCommitted={Boolean(!finalProduct && committedProduct)}
            />
          </div>
        )}

        {/* Section title for remaining/speculative results */}
        <div className="storefront-section-header">
          <span className="section-label">
            {heroProduct ? "Other Candidates in Orbit" : "Live Candidate Pool"}
          </span>
          {isSearching && (
            <span className="searching-badge">
              <span className="spinner-icon" /> Reranking...
            </span>
          )}
        </div>

        {/* Skeleton loading or products grid */}
        {isSearching ? (
          <div className="products-grid">
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </div>
        ) : (
          <div className="products-grid">
            {otherProducts.map((p, idx) => (
              <ProductCard
                key={p.product_id}
                product={p}
                rank={heroProduct ? idx + 2 : idx + 1}
                highlightMatch={phase === "listening" && otherProducts.length <= 3}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
