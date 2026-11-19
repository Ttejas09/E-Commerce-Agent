// NoticeBanner — Calm inline notice for 404/409/network, never a loud or raw error
import { Info, AlertCircle, RefreshCw } from "lucide-react";

interface NoticeBannerProps {
  error: string | null;
  onDismiss: () => void;
  onReset: () => void;
  onEnableMock: () => void;
}

export function NoticeBanner({
  error,
  onDismiss,
  onReset,
  onEnableMock,
}: NoticeBannerProps) {
  if (!error) return null;

  const isNetwork = error.includes("port 8000") || error.includes("Mock mode");
  const is404 = error.includes("expired") || error.includes("not found");

  return (
    <div
      role="status"
      className="w-full px-6 py-2.5 bg-paper border-b border-hairline flex items-center justify-between gap-4 text-xs font-sans transition-colors"
    >
      <div className="flex items-center gap-2 text-ink">
        {is404 ? (
          <AlertCircle size={15} className="text-warningRose shrink-0" />
        ) : (
          <Info size={15} className="text-terracotta shrink-0" />
        )}
        <span>{error}</span>
      </div>

      <div className="flex items-center gap-2">
        {isNetwork && (
          <button
            type="button"
            onClick={onEnableMock}
            className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-terracotta text-paper hover:bg-terracotta/90 transition-all cursor-pointer"
          >
            Switch to Mock mode
          </button>
        )}
        {is404 && (
          <button
            type="button"
            onClick={onReset}
            className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-commitGreen text-paper hover:bg-commitGreen/90 transition-all cursor-pointer flex items-center gap-1"
          >
            <RefreshCw size={11} />
            <span>Start new request</span>
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="text-mutedInk hover:text-ink text-xs px-1.5 py-0.5 rounded cursor-pointer"
          aria-label="Dismiss notice"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
