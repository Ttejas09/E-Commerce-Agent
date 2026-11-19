// ChatPanel — the main shopping agent console
// Features: Word-by-word streaming, voice input, sample presets, live score breakdown, event timeline

import { useState, useRef, useCallback } from "react";
import { useAgent } from "../hooks/useAgent";
import { useVoice } from "../hooks/useVoice";
import { WordStream } from "./WordStream";
import { FilterChips } from "./FilterChips";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { ProductCard } from "./ProductCard";
import { SampleSelector } from "./SampleSelector";
import { ScoreCard } from "./ScoreCard";
import { EventTimeline } from "./EventTimeline";
import type { SampleQuery } from "../data/sampleQueries";

interface ChatPanelProps {
  useMock?: boolean;
}

const PLAYBACK_SPEEDS = [
  { label: "Instant", delay: 0 },
  { label: "Fast (100ms)", delay: 100 },
  { label: "Normal (250ms)", delay: 250 },
  { label: "Slow (500ms)", delay: 500 },
];

export function ChatPanel({ useMock = false }: ChatPanelProps) {
  const {
    state,
    startSession,
    sendWord,
    streamText,
    finishSession,
    reset,
    setTransport,
    setExpectedTarget,
  } = useAgent(useMock);

  const [input, setInput] = useState("");
  const [playbackDelay, setPlaybackDelay] = useState(150);
  const [isPlaying, setIsPlaying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Voice recognition callbacks
  const handleWordFromVoice = useCallback(
    (word: string) => {
      if (state.phase === "listening" || state.phase === "committed") {
        sendWord(word);
      }
    },
    [state.phase, sendWord],
  );

  const handleVoiceDone = useCallback(() => {
    if (state.phase === "listening" || state.phase === "committed") {
      finishSession();
    }
  }, [state.phase, finishSession]);

  const { isListening, isSupported, interim, toggle: toggleVoice } =
    useVoice(handleWordFromVoice, handleVoiceDone);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isPlaying) return;

    if (
      state.phase === "idle" ||
      state.phase === "finished" ||
      state.phase === "error"
    ) {
      setIsPlaying(true);
      await startSession();
      setInput("");
      await streamText(text, playbackDelay);
      setIsPlaying(false);
    } else if (state.phase === "listening" || state.phase === "committed") {
      setInput("");
      setIsPlaying(true);
      await streamText(text, playbackDelay);
      setIsPlaying(false);
    }
  };

  // Preset selector
  const handleSelectSample = async (sample: SampleQuery) => {
    if (isPlaying) return;
    setIsPlaying(true);
    setExpectedTarget(sample.expectedTarget);
    await startSession();
    setInput("");
    await streamText(sample.text, playbackDelay);
    setIsPlaying(false);
  };

  // Voice toggle
  const handleVoiceStart = async () => {
    if (
      state.phase === "idle" ||
      state.phase === "finished" ||
      state.phase === "error"
    ) {
      await startSession();
    }
    toggleVoice();
  };

  // New session reset
  const handleNewRequest = () => {
    reset();
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <div className="chat-panel">
      {/* Header */}
      <header className="chat-panel__header">
        <div className="header-brand">
          <span className="header-brand__icon">🛒</span>
          <div>
            <h1 className="header-brand__title">Anticipatory Commerce</h1>
            <span className="header-brand__subtitle">
              Streaming E-Commerce Agent • Word-by-Word Filter Extraction
            </span>
          </div>
        </div>

        <div className="header-controls">
          {/* Transport mode selector */}
          <div className="transport-selector" title="API Protocol">
            <button
              type="button"
              className={`transport-btn ${state.transport === "http" ? "transport-btn--active" : ""}`}
              onClick={() => setTransport("http")}
              disabled={state.phase === "listening" || state.phase === "processing"}
            >
              HTTP
            </button>
            <button
              type="button"
              className={`transport-btn ${state.transport === "ws" ? "transport-btn--active" : ""}`}
              onClick={() => setTransport("ws")}
              disabled={state.phase === "listening" || state.phase === "processing"}
            >
              WS
            </button>
          </div>

          {useMock && <span className="mock-badge">MOCK</span>}

          <span
            className={`status-dot ${
              state.phase === "error"
                ? "status-dot--error"
                : state.phase === "idle"
                  ? "status-dot--idle"
                  : "status-dot--active"
            }`}
            title={`Status: ${state.phase}`}
          />
        </div>
      </header>

      {/* Quick presets */}
      <section className="chat-panel__presets">
        <SampleSelector
          onSelect={handleSelectSample}
          disabled={isPlaying || state.phase === "processing"}
        />
      </section>

      {/* Main body */}
      <div className="chat-panel__body">
        {/* Word stream visualization */}
        <section className="chat-panel__stream">
          <WordStream
            words={state.words}
            filters={state.filters}
            interim={isListening ? interim : undefined}
          />
        </section>

        {/* Confidence + Search budget */}
        <section className="chat-panel__metrics">
          <ConfidenceMeter
            confidence={state.confidence}
            searches_used={state.searches_used}
            searches_remaining={state.searches_remaining}
            phase={state.phase}
          />
        </section>

        {/* Filter chips */}
        <section className="chat-panel__filters">
          <h2 className="section-title">Extracted Filters (v{state.filters.version})</h2>
          <FilterChips filters={state.filters} />
        </section>

        {/* Committed product (during stream) */}
        {state.committed_product && state.phase !== "finished" && (
          <section className="chat-panel__committed">
            <h2 className="section-title">⚡ Early Commit (Saved Words!)</h2>
            <ProductCard product={state.committed_product} isCommitted />
          </section>
        )}

        {/* Final result (after finish) */}
        {state.final_product && state.phase === "finished" && (
          <section className="chat-panel__result">
            <h2 className="section-title">🎯 Final Recommendation</h2>
            <ProductCard product={state.final_product} isFinal />
          </section>
        )}

        {/* Score Breakdown (after finish) */}
        {state.scoring && state.phase === "finished" && (
          <section className="chat-panel__score">
            <ScoreCard score={state.scoring} />
          </section>
        )}

        {/* Top candidates */}
        {state.top_candidates.length > 0 && state.phase !== "finished" && (
          <section className="chat-panel__candidates">
            <h2 className="section-title">
              Top Candidates ({state.top_candidates.length})
            </h2>
            <div className="candidates-grid">
              {state.top_candidates.map((p, i) => (
                <ProductCard key={p.product_id} product={p} rank={i + 1} />
              ))}
            </div>
          </section>
        )}

        {/* Event Timeline */}
        {state.timeline.length > 0 && (
          <section className="chat-panel__timeline">
            <EventTimeline events={state.timeline} />
          </section>
        )}

        {/* Reason / debug info */}
        {state.reason && (
          <div className="chat-panel__reason">
            <span className="reason-label">Agent State:</span> {state.reason}
          </div>
        )}

        {/* Error display */}
        {state.error && (
          <div className="chat-panel__error">
            <span className="error-icon">⚠️</span>
            <span>{state.error}</span>
          </div>
        )}
      </div>

      {/* Input area */}
      <footer className="chat-panel__footer">
        {state.phase === "finished" ? (
          <button
            type="button"
            className="btn btn--primary btn--full"
            onClick={handleNewRequest}
          >
            🔄 New Shopping Request
          </button>
        ) : (
          <div className="footer-controls">
            {/* Speed selector */}
            <div className="speed-selector">
              <span className="speed-label">Stream Speed:</span>
              <select
                className="speed-select"
                value={playbackDelay}
                onChange={(e) => setPlaybackDelay(Number(e.target.value))}
                disabled={isPlaying}
              >
                {PLAYBACK_SPEEDS.map((s) => (
                  <option key={s.delay} value={s.delay}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <form className="input-form" onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                className="input-form__text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  state.phase === "listening"
                    ? "Add more words or click Send..."
                    : "Type or select a shopping request above..."
                }
                disabled={isPlaying || state.phase === "processing"}
                autoFocus
              />
              {isSupported && (
                <button
                  type="button"
                  className={`btn btn--voice ${isListening ? "btn--voice-active" : ""}`}
                  onClick={handleVoiceStart}
                  disabled={isPlaying || state.phase === "processing"}
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? "⏹️" : "🎤"}
                </button>
              )}
              <button
                type="submit"
                className="btn btn--primary"
                disabled={
                  !input.trim() || isPlaying || state.phase === "processing"
                }
              >
                {isPlaying
                  ? "Streaming..."
                  : state.phase === "listening"
                    ? "Send Words ↵"
                    : "Start Stream ↵"}
              </button>
            </form>
          </div>
        )}
      </footer>
    </div>
  );
}
