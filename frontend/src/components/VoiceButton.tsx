// VoiceButton — Web Speech API button with warm pulse animation and graceful fallback
import { Mic, MicOff } from "lucide-react";

interface VoiceButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function VoiceButton({
  isListening,
  isSupported,
  onToggle,
  disabled = false,
}: VoiceButtonProps) {
  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        className="relative inline-flex items-center justify-center w-11 h-11 rounded-full border border-hairline bg-card/60 text-mutedInk/50 cursor-not-allowed"
        title="Speech recognition is not supported in this browser. Try Chrome or Edge."
        aria-label="Voice input unsupported"
      >
        <MicOff size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex items-center justify-center w-11 h-11 rounded-full border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-terracotta ${
        isListening
          ? "bg-warningRose text-paper border-warningRose shadow-lg"
          : "bg-card hover:bg-paper border-hairline text-ink hover:text-terracotta"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      title={isListening ? "Stop listening" : "Speak your request (English & Hinglish)"}
      aria-label={isListening ? "Stop microphone" : "Start microphone"}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-full animate-ping bg-warningRose opacity-30" />
      )}
      <Mic size={18} className={isListening ? "animate-pulse" : ""} />
    </button>
  );
}
