// SearchBudget — pips for searches used of max 4, with reason tooltip

interface SearchBudgetProps {
  searchesUsed: number;
  maxSearches?: number;
  reason?: string;
}

export function SearchBudget({
  searchesUsed,
  maxSearches = 4,
  reason,
}: SearchBudgetProps) {
  return (
    <div className="flex flex-col gap-1.5 py-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-[11px] text-mutedInk uppercase tracking-wider">
          Search Budget
        </span>
        <span className="font-mono text-xs font-semibold text-ink">
          {searchesUsed} / {maxSearches}{" "}
          <span className="font-sans font-normal text-mutedInk">used</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {Array.from({ length: maxSearches }).map((_, idx) => {
          const isUsed = idx < searchesUsed;
          return (
            <div
              key={idx}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                isUsed
                  ? "bg-terracotta shadow-xs"
                  : "bg-hairline dark:bg-hairline/60"
              }`}
              title={`Search call ${idx + 1}`}
            />
          );
        })}
      </div>

      {reason && (
        <p className="text-[11px] italic text-mutedInk leading-tight mt-0.5">
          {reason}
        </p>
      )}
    </div>
  );
}
