// SampleChips — row of editorial sample-request chips that fill the transcript
import { SAMPLE_REQUESTS, type SampleRequest } from "../config/brand";

interface SampleChipsProps {
  onSelect: (sample: SampleRequest) => void;
  disabled?: boolean;
}

export function SampleChips({ onSelect, disabled = false }: SampleChipsProps) {
  return (
    <div className="flex flex-col gap-1.5 py-1">
      <div className="flex items-center justify-between text-[11px] text-mutedInk">
        <span className="font-mono uppercase tracking-wider text-[10px]">
          Sample Requests
        </span>
        <span className="italic text-[10px]">Click to replay</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {SAMPLE_REQUESTS.map((sample) => (
          <button
            key={sample.id}
            type="button"
            onClick={() => onSelect(sample)}
            disabled={disabled}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-hairline bg-card hover:bg-paper hover:border-terracotta/40 text-ink hover:text-terracotta transition-all shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-1 focus:ring-terracotta"
            title={`${sample.text}\n(${sample.description})`}
          >
            {sample.chipLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
