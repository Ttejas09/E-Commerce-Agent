// ChatPanel — Zone 1: "The Request"
// Big typographic transcript (Fraunces / Instrument Serif 28-36px), hand-drawn SVG squiggle, correction strikethrough with "changed" tag, play/pause controls, sample chips & input

import { useState, useRef } from "react";
import { Play, Pause, RotateCcw, Send } from "lucide-react";
import type { FilterState } from "../types/api";
import { VoiceButton } from "./VoiceButton";
import { SampleChips } from "./SampleChips";
import { SquiggleUnderline } from "./CommittedStamp";
import { SLOT_ACCENTS } from "../tokens/theme";
import type { SampleRequest } from "../config/brand";

interface ChatPanelProps {
  words: string[];
  filters: FilterState;
  supersededWords: string[];
  isStreaming: boolean;
  isPaused: boolean;
  playbackDelay: number;
  interimTranscript?: string;
  isListening: boolean;
  isVoiceSupported: boolean;
  onPlaybackDelayChange: (delay: number) => void;
  onTogglePlayPause: () => void;
  onReplay: () => void;
  onSubmitText: (text: string) => void;
  onInputChange?: (text: string) => void;
  onToggleVoice: () => void;
  onSelectSample: (sample: SampleRequest) => void;
}

export function ChatPanel({
  words,
  filters,
  supersededWords,
  isStreaming,
  isPaused,
  playbackDelay,
  interimTranscript,
  isListening,
  isVoiceSupported,
  onPlaybackDelayChange,
  onTogglePlayPause,
  onReplay,
  onSubmitText,
  onInputChange,
  onToggleVoice,
  onSelectSample,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    onInputChange?.(val);
  };

  // Map words to filter slots for soft highlights
  const slotMap = new Map<string, string>();
  for (const slotKey of [
    "category",
    "colour",
    "size",
    "brand",
    "max_price",
    "min_price",
  ] as const) {
    const fv = filters[slotKey];
    if (fv) {
      for (const p of fv.provenance) {
        slotMap.set(p.toLowerCase().replace(/[,.\-!?;:'"]/g, ""), slotKey);
      }
    }
  }

  const supersededSet = new Set(
    supersededWords.map((w) => w.toLowerCase().replace(/[,.\-!?;:'"]/g, "")),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isStreaming) return;
    onSubmitText(trimmed);
    setInputText("");
  };

  const currentWordIndex = words.length > 0 ? words.length - 1 : -1;

  return (
    <div className="flex flex-col h-full justify-between gap-5 p-6 md:p-8">
      {/* Top: Sample Chips */}
      <SampleChips onSelect={onSelectSample} disabled={isStreaming} />

      {/* Center: Big Typographic Transcript */}
      <div
        className="flex-1 overflow-y-auto min-h-[180px] max-h-[460px] pr-2 flex flex-col justify-center"
        aria-live="polite"
        role="region"
        aria-label="Spoken customer transcript"
      >
        {words.length === 0 && !interimTranscript ? (
          <div className="flex flex-col items-start gap-2 py-8 text-mutedInk">
            <span className="font-serif italic text-2xl md:text-3xl opacity-60">
              "Tell me what you are looking for..."
            </span>
            <p className="text-xs text-mutedInk font-sans">
              Speak via the microphone, type below, or try one of the sample requests above.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-3 font-serif text-2xl md:text-[32px] leading-relaxed text-ink transition-all">
            {words.map((word, idx) => {
              const clean = word.toLowerCase().replace(/[,.\-!?;:'"]/g, "");
              const isSuperseded = supersededSet.has(clean);
              const slot = slotMap.get(clean);
              const isCurrent = idx === currentWordIndex && isStreaming;
              const accent = slot ? SLOT_ACCENTS[slot] : null;

              return (
                <span
                  key={`${idx}-${word}`}
                  className="relative inline-flex flex-col items-center group transition-all"
                >
                  <span
                    className={`transition-all duration-200 ${
                      isSuperseded
                        ? "line-through text-warningRose opacity-50 decoration-2"
                        : slot && accent
                          ? "px-1.5 py-0.5 rounded-md font-medium"
                          : ""
                    }`}
                    style={
                      !isSuperseded && accent
                        ? {
                            backgroundColor: accent.lightBg,
                            color: accent.text,
                          }
                        : undefined
                    }
                  >
                    {word}
                  </span>

                  {/* Hand-drawn squiggle under active streaming word */}
                  {isCurrent && !isSuperseded && (
                    <div className="absolute -bottom-2 w-full">
                      <SquiggleUnderline />
                    </div>
                  )}

                  {/* Tiny "changed" tag on superseded token */}
                  {isSuperseded && (
                    <span className="absolute -top-3 text-[9px] font-mono tracking-tighter bg-warningRose text-paper px-1 rounded uppercase font-bold">
                      changed
                    </span>
                  )}
                </span>
              );
            })}

            {interimTranscript && (
              <span className="italic text-mutedInk opacity-60 font-serif">
                {interimTranscript} ...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls: Speed Slider, Player, Voice, Text Input */}
      <div className="flex flex-col gap-3 pt-4 border-t border-hairline">
        {/* Playback Controls & Pace Slider */}
        <div className="flex items-center justify-between text-xs text-mutedInk">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlayPause}
              disabled={words.length === 0}
              className="p-1.5 rounded-lg border border-hairline hover:bg-card text-ink disabled:opacity-40 cursor-pointer"
              title={isPaused ? "Resume stream" : "Pause stream"}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>
            <button
              type="button"
              onClick={onReplay}
              disabled={words.length === 0 || isStreaming}
              className="p-1.5 rounded-lg border border-hairline hover:bg-card text-ink disabled:opacity-40 cursor-pointer"
              title="Replay from start"
            >
              <RotateCcw size={14} />
            </button>
            <span className="font-mono text-[11px]">
              {words.length} {words.length === 1 ? "word" : "words"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="pace-slider" className="font-mono text-[11px]">
              Pace: {playbackDelay}ms
            </label>
            <input
              id="pace-slider"
              type="range"
              min="150"
              max="700"
              step="50"
              value={playbackDelay}
              onChange={(e) => onPlaybackDelayChange(Number(e.target.value))}
              className="w-24 accent-terracotta cursor-pointer"
              title="Adjust token arrival speed (150ms to 700ms)"
            />
          </div>
        </div>

        {/* Text Input + Voice Button + Send */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Type your shopping request (live search active)..."
            disabled={isStreaming}
            className="flex-1 h-11 px-4 rounded-xl border border-hairline bg-card text-ink placeholder:text-mutedInk/60 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta"
          />

          <VoiceButton
            isListening={isListening}
            isSupported={isVoiceSupported}
            onToggle={onToggleVoice}
            disabled={isStreaming}
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isStreaming}
            className="h-11 px-5 rounded-xl bg-terracotta hover:bg-terracotta/90 text-paper font-medium text-sm transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          >
            <span>Send</span>
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
