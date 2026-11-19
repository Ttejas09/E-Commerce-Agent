// TopBar — Quiet editorial header with serif wordmark, health indicator, mock toggle, and theme switch
import { useEffect, useState } from "react";
import { APP_NAME } from "../config/brand";
import { ThemeToggle } from "./ThemeToggle";
import { healthCheck } from "../lib/api";

interface TopBarProps {
  useMock: boolean;
  onToggleMock: (mock: boolean) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function TopBar({
  useMock,
  onToggleMock,
  isDark,
  onToggleTheme,
}: TopBarProps) {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  // Poll /health quietly on mount and every 20 seconds
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await healthCheck();
        if (mounted) setIsHealthy(res.status === "ok");
      } catch {
        if (mounted) setIsHealthy(false);
      }
    };
    check();
    const interval = setInterval(check, 20000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="w-full h-14 border-b border-hairline px-6 md:px-8 flex items-center justify-between bg-paper select-none transition-colors">
      {/* Brand: Simple wordmark in serif font */}
      <div className="flex items-baseline gap-2.5">
        <h1 className="font-serif italic text-xl md:text-2xl font-bold tracking-tight text-ink">
          {APP_NAME}
        </h1>
        <span className="font-mono text-[10px] uppercase tracking-widest text-mutedInk/80 hidden sm:inline">
          Anticipatory Commerce
        </span>
      </div>

      {/* Quiet top-right corner: Health indicator, Mock toggle, Theme switch */}
      <div className="flex items-center gap-3.5">
        {/* Connection Indicator (GET /health) */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-hairline bg-card text-[11px] font-mono text-mutedInk shadow-2xs"
          title={
            useMock
              ? "Running in self-contained offline Mock mode"
              : isHealthy
                ? "Backend reachable at localhost:8000"
                : "Backend unreachable. Click Mock mode to test offline."
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              useMock
                ? "bg-saffron"
                : isHealthy
                  ? "bg-commitGreen animate-pulse"
                  : "bg-warningRose"
            }`}
          />
          <span className="hidden sm:inline">
            {useMock
              ? "Offline Mock"
              : isHealthy
                ? "Agent Live"
                : "No Server"}
          </span>
        </div>

        {/* Mock Mode Toggle */}
        <label
          className="flex items-center gap-1.5 cursor-pointer text-xs font-mono text-mutedInk hover:text-ink transition-colors"
          title="Toggle between local Mock and Live API"
        >
          <input
            type="checkbox"
            checked={useMock}
            onChange={(e) => onToggleMock(e.target.checked)}
            className="w-3.5 h-3.5 accent-terracotta rounded cursor-pointer"
          />
          <span>Mock mode</span>
        </label>

        {/* Theme Toggle */}
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
