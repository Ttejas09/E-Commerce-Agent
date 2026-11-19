// ScoreCard — shows the scoring formula economics for the current session
import type { SessionScore } from "../types/api";

interface ScoreCardProps {
  score: SessionScore;
}

export function ScoreCard({ score }: ScoreCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 50) return "#22c55e"; // high score
    if (s >= 35) return "#3b82f6"; // good
    if (s >= 20) return "#eab308"; // baseline
    return "#ef4444";              // poor
  };

  return (
    <div className="score-card">
      <div className="score-card__header">
        <div className="score-card__badge">
          <span className="badge-icon">📊</span>
          <span className="badge-text">Evaluation Economics</span>
        </div>
        <div
          className="score-card__main"
          style={{ color: getScoreColor(score.score) }}
        >
          <span className="score-val">{score.score.toFixed(1)}</span>
          <span className="score-max">/ 100</span>
        </div>
      </div>

      <div className="score-card__grid">
        <div className="score-metric">
          <span className="metric-label">Accuracy</span>
          <span
            className={`metric-value ${score.is_correct ? "metric-value--good" : "metric-value--bad"}`}
          >
            {score.is_correct ? "Correct (+40)" : "Incorrect (0)"}
          </span>
        </div>

        <div className="score-metric">
          <span className="metric-label">Earliness Bonus</span>
          <span className="metric-value metric-value--good">
            +{Math.round(score.earliness_share * 60 * 10) / 10} pts
            <span className="metric-sub">
              ({score.words_saved} / {score.total_words} words,{" "}
              {(score.earliness_share * 100).toFixed(0)}%)
            </span>
          </span>
        </div>

        <div className="score-metric">
          <span className="metric-label">Wrong Commits</span>
          <span
            className={`metric-value ${score.wrong_commits > 0 ? "metric-value--bad" : "metric-value--good"}`}
          >
            {score.wrong_commits} (penalty: -{(score.wrong_commits * 100).toFixed(0)})
          </span>
        </div>

        <div className="score-metric">
          <span className="metric-label">Searches / Wasted</span>
          <span className="metric-value">
            {score.searches} / {score.wasted_searches}
            <span className="metric-sub">
              (-{(score.wasted_searches * 2).toFixed(1)} pts)
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
