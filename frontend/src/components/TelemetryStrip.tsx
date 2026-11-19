// TelemetryStrip — compact horizontal telemetry strip with confidence ring and 4-step search stepper
interface TelemetryStripProps {
  confidence: number;
  searchesUsed: number;
  searchesRemaining: number;
  isCommitted?: boolean;
}

const SEARCH_STEPS = [
  { step: 1, label: "Broad" },
  { step: 2, label: "Filtered" },
  { step: 3, label: "Refined" },
  { step: 4, label: "Committed" },
];

export function TelemetryStrip({
  confidence,
  searchesUsed,
  searchesRemaining: _searchesRemaining,
  isCommitted = false,
}: TelemetryStripProps) {
  const percentage = Math.round(confidence * 100);
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (confidence * circumference);

  const getConfidenceColor = () => {
    if (confidence >= 0.94) return "#10b981"; // emerald
    if (confidence >= 0.7) return "#f59e0b";  // amber
    if (confidence >= 0.4) return "#f97316";  // orange
    return "#ef4444";                         // rose
  };

  const strokeColor = getConfidenceColor();

  return (
    <div className="telemetry-strip">
      {/* Compact Confidence Gauge */}
      <div className="telemetry-confidence">
        <div className="telemetry-ring">
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="3.5"
            />
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="3.5"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 22 22)"
              style={{
                transition: "stroke-dashoffset 0.35s ease, stroke 0.35s ease",
              }}
            />
            <text
              x="22"
              y="26"
              textAnchor="middle"
              fill={strokeColor}
              fontSize="11"
              fontWeight="700"
              fontFamily="var(--font-mono)"
            >
              {percentage}%
            </text>
          </svg>
        </div>

        <div className="telemetry-confidence__info">
          <span className="telemetry-label">CALIBRATED CONFIDENCE</span>
          <div className="telemetry-confidence__status">
            {confidence >= 0.94 ? (
              <span className="gate-pill gate-pill--pass">
                ⚡ Commit Gate (≥94%)
              </span>
            ) : (
              <span className="gate-pill gate-pill--accumulating">
                Accumulating evidence
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="telemetry-divider" />

      {/* 4-Step Speculative Search Stepper */}
      <div className="telemetry-searches">
        <div className="telemetry-searches__header">
          <span className="telemetry-label">SPECULATIVE SEARCHES</span>
          <span className="telemetry-counter">
            {searchesUsed} / 4 <span className="counter-dim">used</span>
          </span>
        </div>

        <div className="stepper-dots">
          {SEARCH_STEPS.map((s) => {
            const isUsed = s.step <= searchesUsed;
            const isCurrent = s.step === searchesUsed;
            return (
              <div
                key={s.step}
                className={`stepper-step ${isUsed ? "stepper-step--used" : ""} ${isCurrent ? "stepper-step--current" : ""} ${isCommitted && s.step === 4 ? "stepper-step--committed" : ""}`}
              >
                <div className="stepper-dot" />
                <span className="stepper-step-label">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
