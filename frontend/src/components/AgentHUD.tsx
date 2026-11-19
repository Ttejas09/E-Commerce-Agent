// AgentHUD — Left pane (~40% width) containing presets, transcript, telemetry, filters, and sticky input bar
import { useState, useRef } from "react";
import type { AgentState } from "../types/api";
import type { SampleQuery } from "../data/sampleQueries";
import { PresetBar } from "./PresetBar";
import { TranscriptView } from "./TranscriptView";
import { TelemetryStrip } from "./TelemetryStrip";
import { FilterChips } from "./FilterChips";
import { ScoreCard } from "./ScoreCard";
import { EventTimeline } from "./EventTimeline";

interface AgentHUDProps {
  state: AgentState;
  isPlaying: boolean;
  isListening: boolean;
  isVoiceSupported: boolean;
  interimTranscript?: string;
  onSelectPreset: (preset: SampleQuery) => void;
  onSubmitText: (text: string) => void;
  onToggleVoice: () => void;
  onNewRequest: () => void;
}

export function AgentHUD({
  state,
  isPlaying,
  isListening,
  isVoiceSupported,
  interimTranscript,
  onSelectPreset,
  onSubmitText,
  onToggleVoice,
  onNewRequest,
}: AgentHUDProps) {
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isPlaying) return;
    onSubmitText(trimmed);
    setInputText("");
  };

  const isFinished = state.phase === "finished";

  return (
    <div className="agent-hud">
      {/* 1. Quick Test Presets Bar */}
      <section className="hud-section hud-section--presets">
        <PresetBar
          onSelect={onSelectPreset}
          disabled={isPlaying || state.phase === "processing"}
        />
      </section>

      {/* 2. Scrollable Body: Transcript, Telemetry, Filters, Timeline */}
      <div className="hud-scrollable-body">
        {/* Live Streaming Transcript */}
        <section className="hud-section">
          <TranscriptView
            words={state.words}
            filters={state.filters}
            supersededWords={state.superseded_words}
            interim={interimTranscript}
            isStreaming={isPlaying || state.phase === "listening"}
          />
        </section>

        {/* Compact Telemetry Strip */}
        <section className="hud-section">
          <TelemetryStrip
            confidence={state.confidence}
            searchesUsed={state.searches_used}
            searchesRemaining={state.searches_remaining}
            isCommitted={Boolean(state.committed_product)}
          />
        </section>

        {/* Extracted Filters */}
        <section className="hud-section">
          <FilterChips filters={state.filters} />
        </section>

        {/* Reasoning / Agent status line */}
        {state.reason && (
          <section className="hud-section">
            <div className="agent-reason-line">
              <span className="reason-bullet">⚡</span>
              <span className="reason-text">{state.reason}</span>
            </div>
          </section>
        )}

        {/* Score Card on finish */}
        {state.scoring && isFinished && (
          <section className="hud-section hud-section--score">
            <ScoreCard score={state.scoring} />
          </section>
        )}

        {/* Collapsible event timeline */}
        {state.timeline.length > 0 && (
          <section className="hud-section hud-section--timeline">
            <EventTimeline events={state.timeline} />
          </section>
        )}
      </div>

      {/* 3. Sticky Bottom Input Bar */}
      <div className="hud-sticky-footer">
        {isFinished ? (
          <button
            type="button"
            className="hud-action-btn hud-action-btn--reset"
            onClick={onNewRequest}
          >
            <span className="btn-icon">🔄</span>
            <span>New Shopping Request</span>
          </button>
        ) : (
          <form className="hud-input-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="hud-text-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                state.phase === "listening" || state.phase === "committed"
                  ? "Add more words or click Send..."
                  : "Type a query or pick a preset..."
              }
              disabled={isPlaying || state.phase === "processing"}
            />

            {isVoiceSupported && (
              <button
                type="button"
                className={`hud-voice-btn ${isListening ? "hud-voice-btn--active" : ""}`}
                onClick={onToggleVoice}
                disabled={isPlaying || state.phase === "processing"}
                title={isListening ? "Stop voice listening" : "Start voice speech input"}
              >
                {isListening ? (
                  <span className="pulse-mic">⏹</span>
                ) : (
                  <span className="mic-icon">🎤</span>
                )}
              </button>
            )}

            <button
              type="submit"
              className="hud-action-btn hud-action-btn--primary"
              disabled={!inputText.trim() || isPlaying || state.phase === "processing"}
            >
              {isPlaying
                ? "Streaming..."
                : state.phase === "listening" || state.phase === "committed"
                  ? "Send ↵"
                  : "Stream ↵"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
