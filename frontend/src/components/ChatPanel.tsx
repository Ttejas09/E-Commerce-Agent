// ChatPanel — Zone 1: "The Request"
// Big typographic transcript (Fraunces / Instrument Serif 28-36px), hand-drawn SVG squiggle,
// correction strikethrough with "changed" tag, live as-you-type token streaming,
// anticipatory next-constraint suggestions, play/pause controls, sample chips & input.

import { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, Send, Sparkles } from "lucide-react";
import type { FilterState, ProductSummary } from "../types/api";
import { VoiceButton } from "./VoiceButton";
import { SampleChips } from "./SampleChips";
import { SquiggleUnderline } from "./CommittedStamp";
import { SLOT_ACCENTS } from "../tokens/theme";
import type { SampleRequest } from "../config/brand";

interface ChatPanelProps {
  words: string[];
  filters: FilterState;
  supersededWords: string[];
  topCandidates?: ProductSummary[];
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
  onSendLiveWord?: (word: string) => void;
  onFinishSession?: () => void;
  onToggleVoice: () => void;
  onSelectSample: (sample: SampleRequest) => void;
}

interface Prediction {
  label: string;
  text: string;
  slot: string;
}

export function ChatPanel({
  words,
  filters,
  supersededWords,
  topCandidates = [],
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
  onSendLiveWord,
  onFinishSession,
  onToggleVoice,
  onSelectSample,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const sentWordsCountRef = useRef<number>(0);

  // When outer words are cleared (session reset), reset sent words counter
  useEffect(() => {
    if (words.length === 0) {
      sentWordsCountRef.current = 0;
      setInputText("");
    }
  }, [words.length]);

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

  // Compute smart anticipatory next constraints from active candidates & remaining slots
  const predictions: Prediction[] = [];
  if (topCandidates.length > 0) {
    // 1. Missing size
    if (!filters.size) {
      const sizes = Array.from(
        new Set(topCandidates.map((c) => c.size).filter(Boolean)),
      );
      if (sizes.length > 0) {
        predictions.push({
          label: `size ${sizes[0]}`,
          text: `size ${sizes[0]}`,
          slot: "size",
        });
      }
    }
    // 2. Missing colour
    if (!filters.colour) {
      const colours = Array.from(
        new Set(topCandidates.map((c) => c.colour).filter(Boolean)),
      );
      if (colours.length > 0) {
        predictions.push({
          label: colours[0],
          text: colours[0],
          slot: "colour",
        });
      }
    }
    // 3. Missing max_price
    if (!filters.max_price) {
      const prices = topCandidates.map((c) => c.price).filter(Boolean);
      if (prices.length > 0) {
        const ceilPrice = Math.ceil(Math.max(...prices) / 500) * 500;
        predictions.push({
          label: `under ₹${ceilPrice.toLocaleString("en-IN")}`,
          text: `under ${ceilPrice}`,
          slot: "price",
        });
      }
    }
    // 4. Missing brand
    if (!filters.brand) {
      const brands = Array.from(
        new Set(topCandidates.map((c) => c.brand).filter(Boolean)),
      );
      if (brands.length > 0) {
        predictions.push({
          label: brands[0],
          text: brands[0],
          slot: "brand",
        });
      }
    }
  }

  // Handle typing: as user types a space, the word is removed from the input field and goes up!
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // As soon as space or delimiter is typed:
    if (/\s+$/.test(val)) {
      const trimmed = val.trim();
      if (trimmed) {
        const parts = trimmed.split(/\s+/).filter(Boolean);
        for (const w of parts) {
          if (onSendLiveWord) {
            onSendLiveWord(w);
          } else if (onSubmitText) {
            onSubmitText(w);
          }
        }
      }
      // Word is removed from the input field immediately and goes up!
      setInputText("");
      return;
    }

    setInputText(val);
  };

  const handleApplyPrediction = (predText: string) => {
    const parts = predText.trim().split(/\s+/).filter(Boolean);
    for (const w of parts) {
      if (onSendLiveWord) {
        onSendLiveWord(w);
      } else if (onSubmitText) {
        onSubmitText(w);
      }
    }
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" && predictions.length > 0 && !inputText.trim()) {
      e.preventDefault();
      handleApplyPrediction(predictions[0].text);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = inputText.trim();
    if (trimmed) {
      const parts = trimmed.split(/\s+/).filter(Boolean);
      for (const w of parts) {
        if (onSendLiveWord) {
          onSendLiveWord(w);
        } else if (onSubmitText) {
          onSubmitText(w);
        }
      }
      // Word is removed from the input field immediately!
      setInputText("");
    }

    if (onFinishSession) {
      onFinishSession();
    }
  };

  const currentWordIndex = words.length > 0 ? words.length - 1 : -1;

  return (
    <div className="flex flex-col h-full justify-between gap-4 p-6 md:p-8 overflow-hidden">
      {/* Top: Sample Chips */}
      <div className="shrink-0">
        <SampleChips onSelect={onSelectSample} disabled={isStreaming} />
      </div>

      {/* Center: Big Typographic Transcript */}
      <div
        className="flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col justify-center py-2"
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
              Type live, speak via microphone, or click any suggestion to watch understanding form in real time.
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
            {!isListening && inputText.trim() && (
              <span className="italic text-mutedInk/60 font-serif">
                {inputText.trim()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls: Predictive Chips, Speed Slider, Player, Voice, Text Input */}
      <div className="flex flex-col gap-3 pt-4 border-t border-hairline shrink-0">
        {/* Anticipatory Next-Constraint Prediction Pills */}
        {predictions.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <span className="flex items-center gap-1 font-mono text-[11px] text-terracotta font-medium tracking-tight whitespace-nowrap">
              <Sparkles size={13} className="animate-pulse" />
              Anticipating:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {predictions.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPrediction(p.text)}
                  className="px-2.5 py-1 rounded-full border border-hairline bg-card hover:border-terracotta hover:bg-terracotta/10 text-ink text-xs font-mono transition-all cursor-pointer whitespace-nowrap shadow-2xs hover:scale-105 active:scale-95"
                  title={`Click or press Tab to add: ${p.label}`}
                >
                  + {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

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
          <div className="relative flex-1 flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                predictions.length > 0
                  ? `Type next word (or press Tab for "+ ${predictions[0].label}")...`
                  : "Type live as you speak (press Space to send words)..."
              }
              disabled={isStreaming}
              className="w-full h-11 px-4 rounded-xl border border-hairline bg-card text-ink placeholder:text-mutedInk/60 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta"
            />
          </div>

          <VoiceButton
            isListening={isListening}
            isSupported={isVoiceSupported}
            onToggle={onToggleVoice}
            disabled={isStreaming}
          />

          <button
            type="submit"
            disabled={!inputText.trim() && words.length === 0}
            className="h-11 px-5 rounded-xl bg-terracotta hover:bg-terracotta/90 text-paper font-medium text-sm transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            title="Finish and lock in product"
          >
            <span>{inputText.trim() ? "Send" : "Finish"}</span>
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
