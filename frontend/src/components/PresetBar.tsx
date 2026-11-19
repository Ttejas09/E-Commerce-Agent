// PresetBar — compact, scannable test preset pills for dev cases
import { SAMPLE_QUERIES, type SampleQuery } from "../data/sampleQueries";

interface PresetBarProps {
  onSelect: (query: SampleQuery) => void;
  disabled?: boolean;
}

export function PresetBar({ onSelect, disabled = false }: PresetBarProps) {
  return (
    <div className="preset-bar">
      <div className="preset-bar__header">
        <span className="preset-bar__label">TEST PRESETS</span>
        <span className="preset-bar__hint">Click to stream dev request</span>
      </div>
      <div className="preset-bar__list">
        {SAMPLE_QUERIES.map((q) => (
          <button
            key={q.id}
            type="button"
            className="preset-chip"
            onClick={() => onSelect(q)}
            disabled={disabled}
            title={`${q.text}\nExpected Target: ${q.expectedTarget}`}
          >
            <span
              className="preset-chip__badge"
              style={{
                backgroundColor: `${q.tagColor}18`,
                color: q.tagColor,
                borderColor: `${q.tagColor}40`,
              }}
            >
              {q.tagLabel}
            </span>
            <span className="preset-chip__title">{q.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
