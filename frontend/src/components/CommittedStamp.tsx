// Hand-drawn SVG decorations — "Warm Editorial, Human-Made"
// COMMITTED stamp with ring pulse & check-draw, plus active word Squiggle

import { motion } from "framer-motion";

interface CommittedStampProps {
  className?: string;
  size?: number;
}

export function CommittedStamp({ className = "", size = 72 }: CommittedStampProps) {
  return (
    <motion.div
      initial={{ scale: 1.8, opacity: 0, rotate: -15 }}
      animate={{ scale: 1, opacity: 1, rotate: -8 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="none"
        className="text-[#2F7D5B] dark:text-[#48A37C]"
      >
        {/* Double hand-drawn ring */}
        <motion.circle
          cx="50"
          cy="50"
          r="44"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeDasharray="4 2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        <circle cx="50" cy="50" r="39" stroke="currentColor" strokeWidth="1.5" />

        {/* Circular text path or stamped banner */}
        <rect x="14" y="38" width="72" height="24" rx="3" fill="currentColor" opacity="0.12" />
        <text
          x="50"
          y="54"
          textAnchor="middle"
          fill="currentColor"
          fontSize="12.5"
          fontWeight="900"
          letterSpacing="1.2"
          fontFamily="var(--font-mono)"
        >
          COMMITTED
        </text>

        {/* Subtle Checkmark at top */}
        <motion.path
          d="M44 26L48 30L56 22"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        />
      </svg>
    </motion.div>
  );
}

export function SquiggleUnderline({ className = "w-full" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 12"
      preserveAspectRatio="none"
      className={`h-2 text-[#D9532B] dark:text-[#E06A45] ${className}`}
      fill="none"
    >
      <motion.path
        d="M2 7C12 2 18 11 28 6C38 1 45 11 55 6C65 1 72 11 82 6C90 2 95 9 98 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      />
    </svg>
  );
}
