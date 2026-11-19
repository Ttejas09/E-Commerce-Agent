// ThemeToggle — warm studio toggle between Light (Paper/Ink) and Dark mode
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-hairline bg-card hover:bg-paper transition-all text-mutedInk hover:text-ink text-xs font-medium cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-terracotta"
      title={isDark ? "Switch to daylight paper theme" : "Switch to warm dark studio theme"}
      aria-label="Toggle visual theme"
    >
      {isDark ? (
        <>
          <Sun size={13} className="text-saffron" />
          <span className="font-mono text-[11px]">Paper</span>
        </>
      ) : (
        <>
          <Moon size={13} className="text-terracotta" />
          <span className="font-mono text-[11px]">Night</span>
        </>
      )}
    </button>
  );
}
