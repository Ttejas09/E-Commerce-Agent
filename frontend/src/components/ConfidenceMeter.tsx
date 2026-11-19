// ConfidenceMeter — animated radial gauge showing agent confidence
interface ConfidenceMeterProps {
  confidence: number;
  searches_used: number;
  searches_remaining: number;
  phase: string;
}

export function ConfidenceMeter({
  confidence,
  searches_used,
  searches_remaining,
  phase,
}: ConfidenceMeterProps) {
  const percentage = Math.round(confidence * 100);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (confidence * circumference);

  const getColor = () => {
    if (confidence >= 0.94) return "#22c55e"; // green — commit threshold
    if (confidence >= 0.7) return "#eab308";  // yellow
    if (confidence >= 0.4) return "#f97316";  // orange
    return "#ef4444";                          // red
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case "idle":
        return "Ready";
      case "listening":
        return "Listening...";
      case "processing":
        return "Processing...";
      case "committed":
        return "Committed!";
      case "finished":
        return "Done ✓";
      case "error":
        return "Error";
      default:
        return phase;
    }
  };

  return (
    <div className="confidence-meter">
      <div className="confidence-meter__gauge">
        <svg width="100" height="100" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#1e293b"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={getColor()}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{
              transition: "stroke-dashoffset 0.3s ease, stroke 0.3s ease",
            }}
          />
          {/* Percentage text */}
          <text
            x="50"
            y="46"
            textAnchor="middle"
            fill={getColor()}
            fontSize="18"
            fontWeight="bold"
            style={{ transition: "fill 0.3s ease" }}
          >
            {percentage}%
          </text>
          <text x="50" y="62" textAnchor="middle" fill="#94a3b8" fontSize="9">
            confidence
          </text>
        </svg>
      </div>

      <div className="confidence-meter__info">
        <div className="confidence-meter__phase">{getPhaseLabel()}</div>
        <div className="confidence-meter__searches">
          <span className="searches-label">Searches:</span>
          <span className="searches-value">
            {searches_used} / {searches_used + searches_remaining}
          </span>
          <div className="searches-dots">
            {Array.from({ length: searches_used + searches_remaining }).map(
              (_, i) => (
                <span
                  key={i}
                  className={`search-dot ${i < searches_used ? "search-dot--used" : ""}`}
                />
              ),
            )}
          </div>
        </div>
        {confidence >= 0.94 && (
          <div className="confidence-meter__commit-ready">
            ⚡ Commit threshold met
          </div>
        )}
      </div>
    </div>
  );
}
