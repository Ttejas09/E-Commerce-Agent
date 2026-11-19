// CommitTimeline — Progress bar of request words with marker at commit word
// Displays "Committed with N words to spare (X% early)"

interface CommitTimelineProps {
  totalWords: number;
  commitWordIndex: number | null;
  isFinished: boolean;
}

export function CommitTimeline({
  totalWords,
  commitWordIndex,
  isFinished,
}: CommitTimelineProps) {
  if (totalWords <= 1) return null;

  const effectiveCommitIndex =
    commitWordIndex !== null
      ? commitWordIndex
      : isFinished
        ? totalWords
        : null;

  const wordsRemaining =
    effectiveCommitIndex !== null ? Math.max(0, totalWords - effectiveCommitIndex) : 0;
  const earlinessShare =
    totalWords > 0 && effectiveCommitIndex !== null
      ? (wordsRemaining / totalWords) * 100
      : 0;

  const commitPercentage =
    effectiveCommitIndex !== null
      ? Math.min(100, Math.round((effectiveCommitIndex / totalWords) * 100))
      : 0;

  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-hairline bg-card/60">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-[11px] uppercase tracking-wider text-mutedInk">
          Commit Timeline
        </span>
        <span className="font-mono text-[11px] text-ink font-semibold">
          {effectiveCommitIndex !== null ? (
            <span className="text-commitGreen">
              {wordsRemaining > 0
                ? `⚡ Early lock at word ${effectiveCommitIndex} of ${totalWords}`
                : `Locked at word ${effectiveCommitIndex} of ${totalWords}`}
            </span>
          ) : (
            <span className="text-mutedInk">Observing — awaiting unique match</span>
          )}
        </span>
      </div>

      {/* Progress Track */}
      <div className="relative h-2 w-full rounded-full bg-hairline overflow-visible my-1">
        {/* Fill to commit point */}
        {effectiveCommitIndex !== null && (
          <div
            className="h-full rounded-full bg-commitGreen"
            style={{ width: `${commitPercentage}%` }}
          />
        )}

        {/* Marker at Commit Word */}
        {effectiveCommitIndex !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-card border-2 border-commitGreen flex items-center justify-center shadow-xs"
            style={{ left: `${commitPercentage}%` }}
            title={`Committed at word #${effectiveCommitIndex}`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-commitGreen" />
          </div>
        )}
      </div>

      {/* Earliness Callout */}
      {effectiveCommitIndex !== null && (
        <div className="flex items-center justify-between text-[11px]">
          {wordsRemaining > 0 ? (
            <span className="font-mono text-commitGreen font-medium">
              ⚡ Committed with {wordsRemaining}{" "}
              {wordsRemaining === 1 ? "word" : "words"} to spare ({earlinessShare.toFixed(0)}% early)
            </span>
          ) : (
            <span className="font-mono text-commitGreen font-medium">
              ✓ Confirmed with 100% confidence
            </span>
          )}
          {isFinished && (
            <span className="font-sans text-[11px] text-mutedInk">
              100% final accuracy
            </span>
          )}
        </div>
      )}
    </div>
  );
}
