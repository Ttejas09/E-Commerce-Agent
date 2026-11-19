// Clean SVG Category Silhouettes for the 16 Catalogue Categories
// Rendered on top of the real product color tile in an editorial tone

interface ProductSilhouetteProps {
  category: string;
  className?: string;
  isLightBackground?: boolean;
}

export function ProductSilhouette({
  category,
  className = "w-16 h-16",
  isLightBackground = false,
}: ProductSilhouetteProps) {
  const normCat = category.toLowerCase().trim();
  const strokeColor = isLightBackground ? "rgba(30, 26, 22, 0.55)" : "rgba(255, 253, 248, 0.75)";
  const fillColor = isLightBackground ? "rgba(30, 26, 22, 0.12)" : "rgba(255, 253, 248, 0.18)";

  switch (normCat) {
    case "running shoes":
    case "sneakers":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <path
            d="M6 34C11 34 14 34 18 32C22 30 25 24 28 20C30 17 33 16 38 18L42 22C42 28 41 33 39 34C37 35 24 35 6 35V34Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 35H42V37C42 38 41 39 39 39H9C7 39 6 38 6 37V35Z"
            fill={strokeColor}
          />
          <path d="M23 23L27 27M27 21L31 25" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "sandals":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <ellipse cx="24" cy="34" rx="18" ry="4" fill={strokeColor} />
          <path
            d="M12 33C14 22 20 18 24 18C28 18 34 22 36 33"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M18 33C20 25 24 22 28 33"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case "t-shirts":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <path
            d="M17 11C20 14 28 14 31 11L41 16L37 23L33 21V38H15V21L11 23L7 16L17 11Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "shirts":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <path
            d="M16 11L21 16L24 14L27 16L32 11L42 16L38 23L34 21V39H14V21L10 23L6 16L16 11Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="24" y1="16" x2="24" y2="39" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="2 3" />
        </svg>
      );

    case "hoodies":
    case "jackets":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <path
            d="M16 12C18 9 30 9 32 12L42 17L38 24L34 22V40H14V22L10 24L6 17L16 12Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M19 12C20 18 28 18 29 12" stroke={strokeColor} strokeWidth="1.5" />
          <line x1="24" y1="17" x2="24" y2="40" stroke={strokeColor} strokeWidth="1.5" />
        </svg>
      );

    case "jeans":
    case "track pants":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <path
            d="M15 9H33L36 40H28L24 23L20 40H12L15 9Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="24" y1="9" x2="24" y2="17" stroke={strokeColor} strokeWidth="1.5" />
        </svg>
      );

    case "kurtas":
    case "dresses":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <path
            d="M18 10C21 13 27 13 30 10L38 14L35 19L32 18V41H16V18L13 19L10 14L18 10Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M24 13V22" stroke={strokeColor} strokeWidth="1.5" />
          <path d="M16 35H32" stroke={strokeColor} strokeWidth="1.2" strokeDasharray="2 2" />
        </svg>
      );

    case "caps":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <path
            d="M14 26C14 18 20 14 28 14C35 14 39 19 39 26H14Z"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 26C16 26 22 28 26 31C21 31 13 30 9 26Z"
            fill={strokeColor}
          />
        </svg>
      );

    case "backpacks":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <rect
            x="14"
            y="14"
            width="20"
            height="26"
            rx="6"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.8"
          />
          <path d="M20 14V10C20 8.5 28 8.5 28 10V14" stroke={strokeColor} strokeWidth="1.8" />
          <rect x="18" y="24" width="12" height="10" rx="2" stroke={strokeColor} strokeWidth="1.5" />
        </svg>
      );

    case "wallets":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <rect
            x="10"
            y="16"
            width="28"
            height="18"
            rx="4"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.8"
          />
          <path d="M26 21H38V29H26C24 29 24 21 26 21Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
          <circle cx="31" cy="25" r="1.5" fill={strokeColor} />
        </svg>
      );

    case "watches":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <rect x="20" y="6" width="8" height="36" rx="2" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
          <circle cx="24" cy="24" r="9" fill={fillColor} stroke={strokeColor} strokeWidth="1.8" />
          <path d="M24 19V24L27 26" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case "headphones":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <path
            d="M12 26V22C12 15 17 10 24 10C31 10 36 15 36 22V26"
            stroke={strokeColor}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <rect x="9" y="24" width="7" height="14" rx="3.5" fill={strokeColor} />
          <rect x="32" y="24" width="7" height="14" rx="3.5" fill={strokeColor} />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none">
          <rect x="12" y="12" width="24" height="24" rx="4" stroke={strokeColor} strokeWidth="1.8" fill={fillColor} />
          <circle cx="24" cy="24" r="4" fill={strokeColor} />
        </svg>
      );
  }
}
