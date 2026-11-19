// useVoice — Web Speech API for voice input
// Streams recognized words in real time to the agent via onWord callback

import { useState, useCallback, useRef, useEffect } from "react";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function useVoice(onWord: (word: string) => void, onDone: () => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const sentIndexRef = useRef<number>(0);
  const currentTokensRef = useRef<string[]>([]);
  const isStoppingRef = useRef<boolean>(false);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SR);
  }, []);

  const flushRemainingWords = useCallback(() => {
    const tokens = currentTokensRef.current;
    while (sentIndexRef.current < tokens.length) {
      const w = tokens[sentIndexRef.current];
      if (w) onWord(w);
      sentIndexRef.current++;
    }
    setInterim("");
  }, [onWord]);

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    try {
      recognitionRef.current?.abort();
    } catch {}

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN"; // English + Hindi / Hinglish mixed

    sentIndexRef.current = 0;
    currentTokensRef.current = [];
    isStoppingRef.current = false;
    setInterim("");

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalizedText = "";
      let interimText = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalizedText += result[0].transcript + " ";
        } else {
          interimText += result[0].transcript + " ";
        }
      }

      const allTokens = (finalizedText + " " + interimText)
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      const finalTokens = finalizedText.trim().split(/\s+/).filter(Boolean);

      currentTokensRef.current = allTokens;

      // Safe count: All finalized tokens + any token that is followed by a subsequent word
      const safeCount = Math.max(
        finalTokens.length,
        allTokens.length > 1 ? allTokens.length - 1 : 0
      );

      while (sentIndexRef.current < safeCount) {
        const word = allTokens[sentIndexRef.current];
        if (word) {
          onWord(word);
        }
        sentIndexRef.current++;
      }

      // Remaining uncommitted tokens are shown as live interim text
      const remaining = allTokens.slice(sentIndexRef.current).join(" ");
      setInterim(remaining);
    };

    recognition.onerror = (event: Event & { error: string }) => {
      console.warn("Speech recognition notice:", event.error);
      if (event.error !== "no-speech") {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      flushRemainingWords();
      onDone();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
      setIsListening(false);
    }
  }, [onWord, onDone, flushRemainingWords]);

  const stop = useCallback(() => {
    isStoppingRef.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {}
    setIsListening(false);
    flushRemainingWords();
    onDone();
  }, [flushRemainingWords, onDone]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  return { isListening, isSupported, interim, start, stop, toggle };
}
