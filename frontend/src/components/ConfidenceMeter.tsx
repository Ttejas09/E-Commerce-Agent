// ConfidenceMeter — smooth horizontal meter with a clearly marked 94% commit line
// Shifts saffron (#E9A23B) to green (#2F7D5B) as it crosses the commit threshold

import { motion } from "framer-motion";

interface ConfidenceMeterProps {
  confidence: number; // 0.0 to 1.0
  isCommitted?: boolean;
}

export function ConfidenceMeter({
  confidence,
  isCommitted = false,
}: ConfidenceMeterProps) {
  const percentage = Math.min(100, Math.max(0, Math.round(confidence * 100)));
  const isPastCommitLine = confidence >= 0.94;

  return (
    <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-hairline bg-card/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-mutedInk">
            Confidence
          </span>
          {isPastCommitLine && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-commitGreen/10 text-commitGreen border border-commitGreen/20">
              ⚡ Over 94% Gate
            </span>
          )}
        </div>
        <span
          className={`font-mono text-base font-bold transition-colors ${
            isPastCommitLine
              ? "text-commitGreen"
              : confidence >= 0.5
                ? "text-saffron"
                : "text-mutedInk"
          }`}
        >
          {percentage}%
        </span>
      </div>

      {/* Meter Bar Container */}
      <div className="relative h-3 w-full rounded-full bg-hairline/80 overflow-visible">
        {/* Fill Bar */}
        <motion.div
          className="h-full rounded-full transition-colors duration-300"
          style={{
            backgroundColor: isPastCommitLine
              ? "var(--color-commitGreen, #2F7D5B)"
              : "var(--color-saffron, #E9A23B)",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        />

        {/* 94% Commit Threshold Line */}
        <div
          className="absolute top-[-3px] bottom-[-3px] w-[2px] bg-ink dark:bg-mutedInk z-10"
          style={{ left: "94%" }}
          title="94% Calibrated Expected-Value Commit Threshold"
        >
          <span className="absolute -top-5 -translate-x-1/2 font-mono text-[9px] font-bold text-mutedInk bg-card px-1 rounded border border-hairline shadow-xs">
            94%
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-mutedInk font-mono">
        <span>0%</span>
        <span className="italic font-sans">
          {isCommitted
            ? "Decision locked in"
            : isPastCommitLine
              ? "Ready to commit target"
              : "Listening for clarifying constraints"}
        </span>
        <span>100%</span>
      </div>
    </div>
  );
}
