// TranscriptView — live streaming transcript with slot accent underlines and correction strikethrough
import type { FilterState } from "../types/api";

interface TranscriptViewProps {
  words: string[];
  filters: FilterState;
  supersededWords: string[];
  interim?: string;
  isStreaming?: boolean;
}

const CORRECTION_MARKERS = new Set([
  "oops",
  "sorry",
  "wait",
  "actually",
  "instead",
  "nahi",
]);

export function TranscriptView({
  words,
  filters,
  supersededWords,
  interim,
  isStreaming = false,
}: TranscriptViewProps) {
  // Map clean words to active slot types for accent underline styling
  const slotMap = new Map<string, string>();
  for (const slotKey of [
    "category",
    "colour",
    "size",
    "brand",
    "max_price",
    "min_price",
  ] as const) {
    const fv = filters[slotKey];
    if (fv) {
      for (const p of fv.provenance) {
        slotMap.set(p.toLowerCase().replace(/[,.\-!?;:'"]/g, ""), slotKey);
      }
    }
  }

  const supersededSet = new Set(
    supersededWords.map((w) => w.toLowerCase().replace(/[,.\-!?;:'"]/g, "")),
  );

  return (
    <div className="transcript-box">
      <div className="transcript-box__header">
        <div className="transcript-box__title">
          <span className="live-indicator">
            <span
              className={`live-indicator__dot ${isStreaming ? "live-indicator__dot--active" : ""}`}
            />
          </span>
          <span className="title-text">STREAMING UTTERANCE</span>
        </div>
        <span className="transcript-box__counter">
          {words.length} {words.length === 1 ? "token" : "tokens"}
        </span>
      </div>

      <div className="transcript-box__content">
        {words.length === 0 && !interim ? (
          <div className="transcript-box__empty">
            <span className="empty-icon">💬</span>
            <span className="empty-text">
              Waiting for voice input or typed query...
            </span>
            <span className="empty-sub">
              Pick a test preset above or type words below to observe the agent.
            </span>
          </div>
        ) : (
          <div className="transcript-stream">
            {words.map((word, i) => {
              const clean = word.toLowerCase().replace(/[,.\-!?;:'"]/g, "");
              const isSuperseded = supersededSet.has(clean);
              const slot = slotMap.get(clean);
              const isCorrectionMarker = CORRECTION_MARKERS.has(clean);

              let tokenClasses = "token";
              if (isSuperseded) {
                tokenClasses += " token--superseded";
              } else if (slot) {
                tokenClasses += ` token--slot token--slot-${slot}`;
              } else if (isCorrectionMarker) {
                tokenClasses += " token--marker";
              }

              return (
                <span
                  key={`${i}-${word}`}
                  className={tokenClasses}
                  data-slot={!isSuperseded && slot ? slot : undefined}
                  title={
                    isSuperseded
                      ? `Superseded by subsequent correction`
                      : slot
                        ? `Mapped to slot: ${slot}`
                        : isCorrectionMarker
                          ? `Correction marker`
                          : undefined
                  }
                >
                  <span className="token__text">{word}</span>
                  {!isSuperseded && slot && (
                    <span className="token__underline" />
                  )}
                </span>
              );
            })}

            {interim && (
              <span className="token token--interim">
                <span className="token__text">{interim}</span>
              </span>
            )}

            {isStreaming && <span className="streaming-cursor" />}
          </div>
        )}
      </div>
    </div>
  );
}
