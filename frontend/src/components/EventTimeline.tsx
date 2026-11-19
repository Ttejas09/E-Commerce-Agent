// EventTimeline — collapsible stream of agent reasoning & observations
import { useState } from "react";
import type { TimelineEvent } from "../types/api";

interface EventTimelineProps {
  events: TimelineEvent[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (events.length === 0) return null;

  const getEventBadge = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "commit":
        return { label: "⚡ Commit", color: "#eab308" };
      case "search":
        return { label: "🔍 Search", color: "#3b82f6" };
      case "correction":
        return { label: "🔄 Correction", color: "#f97316" };
      case "finish":
        return { label: "✅ Finish", color: "#22c55e" };
      default:
        return { label: "Word", color: "#94a3b8" };
    }
  };

  return (
    <div className="event-timeline">
      <button
        type="button"
        className="timeline-toggle"
        onClick={() => setIsOpen((v) => !v)}
      >
        <span className="timeline-toggle__title">
          <span>📜</span> Event Timeline ({events.length} steps)
        </span>
        <span className="timeline-toggle__arrow">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="timeline-list">
          {events.map((ev) => {
            const badge = getEventBadge(ev.type);
            return (
              <div
                key={ev.id}
                className={`timeline-item timeline-item--${ev.type}`}
              >
                <div className="timeline-item__meta">
                  <span className="timeline-item__step">#{ev.word_index}</span>
                  <span
                    className="timeline-item__badge"
                    style={{
                      backgroundColor: `${badge.color}22`,
                      color: badge.color,
                      borderColor: badge.color,
                    }}
                  >
                    {badge.label}
                  </span>
                  <span className="timeline-item__word">"{ev.word}"</span>
                </div>
                <div className="timeline-item__desc">{ev.description}</div>
                <div className="timeline-item__conf">
                  {(ev.confidence * 100).toFixed(0)}% conf
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
