// ProductCard — displays a product summary with visual styling
import type { ProductSummary } from "../types/api";

interface ProductCardProps {
  product: ProductSummary;
  isCommitted?: boolean;
  isFinal?: boolean;
  rank?: number;
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

export function ProductCard({
  product,
  isCommitted = false,
  isFinal = false,
  rank,
}: ProductCardProps) {
  const emoji = CATEGORY_EMOJIS[product.category] || "📦";

  return (
    <div
      className={`product-card ${isCommitted ? "product-card--committed" : ""} ${isFinal ? "product-card--final" : ""}`}
    >
      {rank !== undefined && (
        <span className="product-card__rank">#{rank}</span>
      )}
      {(isCommitted || isFinal) && (
        <span className="product-card__badge">
          {isFinal ? "✅ Final Answer" : "⚡ Committed"}
        </span>
      )}

      <div className="product-card__header">
        <span className="product-card__emoji">{emoji}</span>
        <div>
          <h3 className="product-card__title">{product.title}</h3>
          <span className="product-card__id">{product.product_id}</span>
        </div>
      </div>

      <div className="product-card__details">
        <div className="product-card__detail">
          <span className="detail-label">Brand</span>
          <span className="detail-value">{product.brand}</span>
        </div>
        <div className="product-card__detail">
          <span className="detail-label">Category</span>
          <span className="detail-value">{product.category}</span>
        </div>
        <div className="product-card__detail">
          <span className="detail-label">Colour</span>
          <span className="detail-value">
            <span
              className="colour-dot"
              style={{
                backgroundColor:
                  product.colour === "navy"
                    ? "#001f3f"
                    : product.colour === "olive"
                      ? "#808000"
                      : product.colour === "maroon"
                        ? "#800000"
                        : product.colour === "beige"
                          ? "#f5f5dc"
                          : product.colour === "tan"
                            ? "#d2b48c"
                            : product.colour,
              }}
            />
            {product.colour}
          </span>
        </div>
        <div className="product-card__detail">
          <span className="detail-label">Size</span>
          <span className="detail-value">{product.size || "—"}</span>
        </div>
      </div>

      <div className="product-card__price">
        ₹{product.price.toLocaleString("en-IN")}
      </div>
    </div>
  );
}
