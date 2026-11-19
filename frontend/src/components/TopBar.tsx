// TopBar — slim utility header with title and grouped developer/demo controls
import type { AgentPhase, TransportMode } from "../types/api";

interface TopBarProps {
  transport: TransportMode;
  onTransportChange: (transport: TransportMode) => void;
  phase: AgentPhase;
  playbackDelay: number;
  onPlaybackDelayChange: (delay: number) => void;
  useMock: boolean;
  onToggleMock: (useMock: boolean) => void;
  disabledControls?: boolean;
}

export const PLAYBACK_SPEEDS = [
  { label: "Instant", delay: 0 },
  { label: "Fast (100ms)", delay: 100 },
  { label: "Normal (250ms)", delay: 250 },
  { label: "Slow (500ms)", delay: 500 },
];

export function TopBar({
  transport,
  onTransportChange,
  phase,
  playbackDelay,
  onPlaybackDelayChange,
  useMock,
  onToggleMock,
  disabledControls = false,
}: TopBarProps) {
  const getStatusInfo = () => {
    switch (phase) {
      case "listening":
        return { text: "Listening", color: "amber", pulse: true };
      case "processing":
        return { text: "Processing", color: "blue", pulse: true };
      case "committed":
        return { text: "Committed", color: "yellow", pulse: false };
      case "finished":
        return { text: "Done", color: "emerald", pulse: false };
      case "error":
        return { text: "Error", color: "rose", pulse: false };
      default:
        return { text: "Ready", color: "emerald", pulse: false };
    }
  };

  const status = getStatusInfo();

  return (
    <header className="top-bar">
      <div className="top-bar__left">
        <div className="app-brand">
          <div className="app-brand__icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
          </div>
          <div className="app-brand__text">
            <div className="app-brand__title-row">
              <span className="app-brand__title">Anticipatory Commerce</span>
              <span className="app-brand__badge">v2.1</span>
            </div>
            <span className="app-brand__subtitle">
              Streaming E-Commerce Agent • Live Brain + Storefront
            </span>
          </div>
        </div>
      </div>

      <div className="top-bar__right">
        {/* Protocol toggle */}
        <div className="segmented-control" title="API Protocol">
          <button
            type="button"
            className={`segmented-btn ${transport === "http" ? "segmented-btn--active" : ""}`}
            onClick={() => onTransportChange("http")}
            disabled={disabledControls}
          >
            HTTP
          </button>
          <button
            type="button"
            className={`segmented-btn ${transport === "ws" ? "segmented-btn--active" : ""}`}
            onClick={() => onTransportChange("ws")}
            disabled={disabledControls}
          >
            WS
          </button>
        </div>

        {/* Live status pill */}
        <div className={`status-pill status-pill--${status.color}`}>
          <span
            className={`status-pill__dot ${status.pulse ? "status-pill__dot--pulse" : ""}`}
          />
          <span className="status-pill__text">{status.text}</span>
        </div>

        {/* Playback speed dropdown */}
        <div className="top-control speed-dropdown">
          <label htmlFor="stream-speed" className="control-label">Speed:</label>
          <select
            id="stream-speed"
            className="speed-dropdown__select"
            value={playbackDelay}
            onChange={(e) => onPlaybackDelayChange(Number(e.target.value))}
            disabled={disabledControls}
          >
            {PLAYBACK_SPEEDS.map((s) => (
              <option key={s.delay} value={s.delay}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Mock API toggle */}
        <div className="top-control mock-switch-control" title="Toggle between local Mock and Live API">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={useMock}
              onChange={(e) => onToggleMock(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
          <span className={`mock-label ${useMock ? "mock-label--active" : ""}`}>
            Mock API
          </span>
        </div>
      </div>
    </header>
  );
}
