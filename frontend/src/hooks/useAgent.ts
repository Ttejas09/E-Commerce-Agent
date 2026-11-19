// useAgent — Core session lifecycle hook
// Handles sequential observe queue (word_index >= 1), commit-once discipline,
// calm ErrorResponse notices for 404/409, scripted offline Mock mode, and pause/replay.

import { useState, useCallback, useRef } from "react";
import type {
  AgentState,
  ObserveResponse,
  FinishResponse,
  ProductSummary,
} from "../types/api";
import { INITIAL_AGENT_STATE } from "../types/api";
import { agentStart, agentObserve, agentFinish, ApiError } from "../lib/api";
import { mockStart, mockObserve, mockFinish } from "../lib/mock";
import type { GhostFilterItem } from "../components/FilterChips";

function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface UseAgentOptions {
  initialMock?: boolean;
}

interface SessionInfo {
  requestId: string | null;
  phase: AgentState["phase"];
  wordIndex: number;
  words: string[];
  filters: AgentState["filters"];
  hasCommitted: boolean;
  committedProduct: ProductSummary | null;
  committedWordIndex: number | null;
  supersededWords: string[];
}

export function useAgent(options: UseAgentOptions = {}) {
  const envMock = import.meta.env.VITE_USE_MOCK !== undefined
    ? import.meta.env.VITE_USE_MOCK === "true"
    : false;
  const [useMock, setUseMock] = useState(options.initialMock ?? envMock);
  const [state, setState] = useState<AgentState>(INITIAL_AGENT_STATE);
  const [ghostFilters, setGhostFilters] = useState<GhostFilterItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackDelay, setPlaybackDelay] = useState(250); // 150-700ms

  // Synchronous session ref to guarantee strict ordering (word_index 1, 2, 3...)
  // and prevent React async batching race conditions.
  const sessionRef = useRef<SessionInfo>({
    requestId: null,
    phase: "idle",
    wordIndex: 0,
    words: [],
    filters: INITIAL_AGENT_STATE.filters,
    hasCommitted: false,
    committedProduct: null,
    committedWordIndex: null,
    supersededWords: [],
  });

  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const abortRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const lastTextRef = useRef<string>("");

  isPausedRef.current = isPaused;

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    queueRef.current = Promise.resolve();
    sessionRef.current = {
      requestId: null,
      phase: "idle",
      wordIndex: 0,
      words: [],
      filters: INITIAL_AGENT_STATE.filters,
      hasCommitted: false,
      committedProduct: null,
      committedWordIndex: null,
      supersededWords: [],
    };
    setIsStreaming(false);
    setIsPaused(false);
    setGhostFilters([]);
    setState(INITIAL_AGENT_STATE);
  }, []);

  // Format error messages into calm human copy
  const handleApiError = useCallback((err: unknown) => {
    let message = "Something went wrong while connecting to the agent.";
    if (err instanceof ApiError) {
      if (err.status === 404) {
        message = "Your session expired or was not found. Feel free to start a new request.";
      } else if (err.status === 409) {
        message = "A sequence conflict occurred (words arrived out of order). Session refreshed.";
      } else {
        message = err.detail || `Agent returned notice [${err.error_code}].`;
      }
    } else if (err instanceof Error) {
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        message = "Unable to reach local agent at port 8000. Try enabling Mock mode above.";
      } else {
        message = err.message;
      }
    }
    sessionRef.current.phase = "error";
    setState((s) => ({ ...s, phase: "error", error: message }));
  }, []);

  // Start new session
  const startSession = useCallback(async () => {
    abortRef.current = false;
    queueRef.current = Promise.resolve();
    const request_id = generateRequestId();

    sessionRef.current = {
      requestId: request_id,
      phase: "listening",
      wordIndex: 0,
      words: [],
      filters: INITIAL_AGENT_STATE.filters,
      hasCommitted: false,
      committedProduct: null,
      committedWordIndex: null,
      supersededWords: [],
    };

    setIsStreaming(false);
    setIsPaused(false);
    setGhostFilters([]);
    setState((s) => ({
      ...s,
      phase: "listening",
      request_id,
      words: [],
      word_index: 0,
      filters: INITIAL_AGENT_STATE.filters,
      confidence: 0,
      searches_used: 0,
      searches_remaining: 4,
      committed_product: null,
      commit_word_index: null,
      final_product: null,
      top_candidates: [],
      reason: "Listening...",
      timeline: [],
      scoring: null,
      superseded_words: [],
      error: null,
    }));

    try {
      if (useMock) {
        await mockStart(request_id);
      } else {
        await agentStart({ request_id });
      }
    } catch (err: unknown) {
      handleApiError(err);
    }

    return request_id;
  }, [useMock, handleApiError]);

  // Send single word through sequential queue (word_index starts at 1)
  const sendWord = useCallback(
    (word: string): Promise<ObserveResponse | null> => {
      return new Promise((resolve) => {
        queueRef.current = queueRef.current.then(async () => {
          if (abortRef.current) {
            resolve(null);
            return;
          }

          // Handle pause
          while (isPausedRef.current && !abortRef.current) {
            await new Promise((r) => setTimeout(r, 100));
          }

          const currentSession = sessionRef.current;
          if (
            !currentSession.requestId ||
            currentSession.phase === "finished" ||
            currentSession.phase === "error"
          ) {
            resolve(null);
            return;
          }

          // Strictly sequential wordIndex increment
          currentSession.wordIndex += 1;
          const currentWordIndex = currentSession.wordIndex;
          currentSession.words.push(word);
          const currentWords = [...currentSession.words];
          lastTextRef.current = currentWords.join(" ");

          try {
            let response: ObserveResponse;
            if (useMock) {
              response = await mockObserve(word, currentWordIndex);
            } else {
              response = await agentObserve({
                request_id: currentSession.requestId,
                word,
                word_index: currentWordIndex,
                is_final: false,
              });
            }

            // Detect superseded slot values (ghost chips)
            const newlySupersededTokens: string[] = [];
            const newGhosts: GhostFilterItem[] = [];
            const slotKeys = [
              "category",
              "colour",
              "size",
              "brand",
              "max_price",
              "min_price",
            ] as const;

            for (const key of slotKeys) {
              const prev = currentSession.filters[key];
              const curr = response.filters[key];
              if (
                prev &&
                curr &&
                String(prev.value).toLowerCase() !== String(curr.value).toLowerCase()
              ) {
                newlySupersededTokens.push(...prev.provenance);
                newGhosts.push({
                  slot: key,
                  value: prev.value,
                });
              }
            }

            if (newGhosts.length > 0) {
              setGhostFilters((prev) => [...prev, ...newGhosts]);
            }

            const updatedSuperseded = Array.from(
              new Set([...currentSession.supersededWords, ...newlySupersededTokens]),
            );
            currentSession.supersededWords = updatedSuperseded;
            currentSession.filters = response.filters;

            // COMMIT-ONCE DISCIPLINE:
            if (response.commit && !currentSession.hasCommitted) {
              currentSession.hasCommitted = true;
              currentSession.committedProduct = response.committed_product;
              currentSession.committedWordIndex = currentWordIndex;
              currentSession.phase = "committed";
            }

            setState((prev) => ({
              ...prev,
              words: currentWords,
              word_index: currentWordIndex,
              filters: response.filters,
              confidence: response.confidence,
              searches_used: response.searches_used,
              searches_remaining: response.searches_remaining,
              top_candidates: response.top_candidates,
              reason: response.reason,
              superseded_words: updatedSuperseded,
              committed_product: currentSession.committedProduct,
              commit_word_index: currentSession.committedWordIndex,
              phase: currentSession.hasCommitted ? "committed" : "listening",
            }));

            resolve(response);
          } catch (err: unknown) {
            handleApiError(err);
            resolve(null);
          }
        });
      });
    },
    [useMock, handleApiError],
  );

  // Finish session
  const finishSession = useCallback(async (): Promise<FinishResponse | null> => {
    return new Promise((resolve) => {
      queueRef.current = queueRef.current.then(async () => {
        const currentSession = sessionRef.current;
        if (!currentSession.requestId || currentSession.phase === "finished") {
          resolve(null);
          return;
        }

        try {
          let response: FinishResponse;
          if (useMock) {
            response = await mockFinish();
          } else {
            response = await agentFinish({
              request_id: currentSession.requestId,
            });
          }

          currentSession.phase = "finished";
          currentSession.filters = response.filters;

          const totalWords = currentSession.words.length;
          const wasCommitted =
            currentSession.hasCommitted && currentSession.committedWordIndex !== null;
          const commitWord = wasCommitted
            ? currentSession.committedWordIndex!
            : totalWords;
          const wordsRemaining = Math.max(0, totalWords - commitWord);
          const earlinessShare =
            totalWords > 0 ? wordsRemaining / totalWords : 0;

          if (currentSession.words.length > 0) {
            lastTextRef.current = currentSession.words.join(" ");
          }

          const isRevisedAtFinish =
            wasCommitted &&
            response.product !== null &&
            response.product_id !== currentSession.committedProduct?.product_id;

          setState((prev) => ({
            ...prev,
            phase: "finished",
            filters: response.filters,
            confidence: response.confidence,
            searches_used: response.searches_used,
            final_product: response.product,
            scoring: {
              total_words: totalWords,
              commit_word: commitWord,
              words_saved: wordsRemaining,
              earliness_share: earlinessShare,
              wrong_commits: 0,
              searches: response.searches_used,
              wasted_searches: Math.max(0, response.searches_used - 1),
              score: Math.round((0.4 + 0.6 * earlinessShare) * 100),
              is_correct: true,
            },
            reason: isRevisedAtFinish
              ? "Revised after your last words"
              : response.product
                ? "Locked in final product"
                : "Search complete",
          }));

          setIsStreaming(false);
          resolve(response);
        } catch (err: unknown) {
          handleApiError(err);
          setIsStreaming(false);
          resolve(null);
        }
      });
    });
  }, [useMock, handleApiError]);

  // Stream full text word-by-word at controllable pace
  const streamText = useCallback(
    async (text: string, customDelay?: number) => {
      lastTextRef.current = text;
      setIsStreaming(true);
      setIsPaused(false);
      const delay = customDelay ?? playbackDelay;
      const words = text.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        setIsStreaming(false);
        return;
      }

      for (let i = 0; i < words.length; i++) {
        if (abortRef.current) break;
        await sendWord(words[i]);
        if (delay > 0 && i < words.length - 1) {
          await new Promise((r) => setTimeout(r, delay));
        }
      }

      if (!abortRef.current) {
        await finishSession();
      }
      setIsStreaming(false);
    },
    [playbackDelay, sendWord, finishSession],
  );

  // Send a live word as typed or dictated in real time
  const sendLiveWord = useCallback(
    async (word: string) => {
      const clean = word.trim();
      if (!clean) return null;
      const currentSession = sessionRef.current;
      if (
        !currentSession.requestId ||
        currentSession.phase === "idle" ||
        currentSession.phase === "finished" ||
        currentSession.phase === "error"
      ) {
        await startSession();
      }
      return sendWord(clean);
    },
    [startSession, sendWord],
  );

  // Play / Pause toggle
  const togglePlayPause = useCallback(() => {
    setIsPaused((p) => {
      const next = !p;
      isPausedRef.current = next;
      return next;
    });
  }, []);

  // Replay last query
  const replay = useCallback(async () => {
    if (isStreaming) return;
    const textToReplay =
      lastTextRef.current ||
      state.words.join(" ") ||
      sessionRef.current.words.join(" ");
    if (!textToReplay.trim()) return;

    lastTextRef.current = textToReplay.trim();
    await startSession();
    await streamText(textToReplay.trim());
  }, [isStreaming, state.words, startSession, streamText]);

  return {
    state,
    useMock,
    setUseMock,
    ghostFilters,
    isStreaming,
    isPaused,
    playbackDelay,
    setPlaybackDelay,
    startSession,
    sendWord,
    sendLiveWord,
    streamText,
    finishSession,
    togglePlayPause,
    replay,
    reset,
    clearError,
  };
}
