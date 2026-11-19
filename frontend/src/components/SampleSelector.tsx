// SampleSelector — clickable test presets covering key dev test cases
import { SAMPLE_QUERIES, type SampleQuery } from "../data/sampleQueries";

interface SampleSelectorProps {
  onSelect: (query: SampleQuery) => void;
  disabled?: boolean;
}

export function SampleSelector({ onSelect, disabled = false }: SampleSelectorProps) {
  return (
    <div className="sample-selector">
      <div className="sample-selector__header">
        <span className="sample-selector__title">Quick Test Presets:</span>
      </div>
      <div className="sample-selector__chips">
        {SAMPLE_QUERIES.map((q) => (
          <button
            key={q.id}
            type="button"
            className="sample-chip"
            onClick={() => onSelect(q)}
            disabled={disabled}
            title={q.text}
          >
            <span
              className="sample-chip__tag"
              style={{ backgroundColor: `${q.tagColor}22`, color: q.tagColor }}
            >
              {q.tagLabel}
            </span>
            <span className="sample-chip__title">{q.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
