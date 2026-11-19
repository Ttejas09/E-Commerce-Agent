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

export function useAgent(options: UseAgentOptions = {}) {
  const [useMock, setUseMock] = useState(options.initialMock ?? false);
  const [state, setState] = useState<AgentState>(INITIAL_AGENT_STATE);
  const [ghostFilters, setGhostFilters] = useState<GhostFilterItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackDelay, setPlaybackDelay] = useState(250); // 150-700ms

  // Internal refs
  const stateRef = useRef<AgentState>(INITIAL_AGENT_STATE);
  stateRef.current = state;
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const abortRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const hasCommittedRef = useRef<boolean>(false);
  const committedProductRef = useRef<ProductSummary | null>(null);
  const committedWordIndexRef = useRef<number | null>(null);
  const lastTextRef = useRef<string>("");

  isPausedRef.current = isPaused;

  const clearError = useCallback(() => {
    stateRef.current = { ...stateRef.current, error: null };
    setState((s) => ({ ...s, error: null }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    hasCommittedRef.current = false;
    committedProductRef.current = null;
    committedWordIndexRef.current = null;
    setIsStreaming(false);
    setIsPaused(false);
    setGhostFilters([]);
    stateRef.current = INITIAL_AGENT_STATE;
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
    stateRef.current = { ...stateRef.current, phase: "error", error: message };
    setState((s) => ({ ...s, phase: "error", error: message }));
  }, []);

  // Start new session
  const startSession = useCallback(async () => {
    reset();
    abortRef.current = false;
    hasCommittedRef.current = false;
    const request_id = generateRequestId();

    const nextState: AgentState = {
      ...INITIAL_AGENT_STATE,
      phase: "listening",
      request_id,
      words: [],
      word_index: 0,
      timeline: [],
      scoring: null,
      superseded_words: [],
      error: null,
    };
    stateRef.current = nextState;
    setState(nextState);

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
  }, [useMock, reset, handleApiError]);

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

          const s = stateRef.current;
          if (
            (s.phase !== "listening" && s.phase !== "committed") ||
            !s.request_id
          ) {
            resolve(null);
            return;
          }

          const newWordIndex = s.word_index + 1; // starts at 1
          const newWords = [...s.words, word];

          try {
            let response: ObserveResponse;
            if (useMock) {
              response = await mockObserve(word, newWordIndex);
            } else {
              response = await agentObserve({
                request_id: s.request_id!,
                word,
                word_index: newWordIndex,
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
              const prev = s.filters[key];
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
              new Set([...s.superseded_words, ...newlySupersededTokens]),
            );

            // COMMIT-ONCE DISCIPLINE:
            // Only trigger commit if not previously committed!
            let activeCommitProduct = s.committed_product;
            let activeCommitIndex = s.commit_word_index;

            if (response.commit && !hasCommittedRef.current) {
              hasCommittedRef.current = true;
              activeCommitProduct = response.committed_product;
              activeCommitIndex = newWordIndex;
              committedProductRef.current = response.committed_product;
              committedWordIndexRef.current = newWordIndex;
            }

            const nextState: AgentState = {
              ...s,
              words: newWords,
              word_index: newWordIndex,
              filters: response.filters,
              confidence: response.confidence,
              searches_used: response.searches_used,
              searches_remaining: response.searches_remaining,
              top_candidates: response.top_candidates,
              reason: response.reason,
              superseded_words: updatedSuperseded,
              committed_product: activeCommitProduct,
              commit_word_index: activeCommitIndex,
              phase: hasCommittedRef.current ? "committed" : "listening",
            };
            stateRef.current = nextState;
            setState(nextState);

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
        const s = stateRef.current;
        if (!s.request_id) {
          resolve(null);
          return;
        }

        const processingState: AgentState = { ...s, phase: "processing" };
        stateRef.current = processingState;
        setState(processingState);

        try {
          let response: FinishResponse;
          if (useMock) {
            response = await mockFinish();
          } else {
            response = await agentFinish({ request_id: s.request_id });
          }

          // Calculate earliness once finish is called: words_remaining / total_words
          const totalWords = s.word_index;
          const commitWord = committedWordIndexRef.current;
          const wordsRemaining = commitWord !== null ? Math.max(0, totalWords - commitWord) : 0;
          const earlinessShare = totalWords > 0 && commitWord !== null ? wordsRemaining / totalWords : 0;

          // Check if revised at finish
          const wasCommitted = committedProductRef.current !== null;
          const isRevisedAtFinish =
            wasCommitted &&
            response.product !== null &&
            response.product_id !== committedProductRef.current?.product_id;

          const finishedState: AgentState = {
            ...s,
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
          };
          stateRef.current = finishedState;
          setState(finishedState);

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

  // Play / Pause toggle
  const togglePlayPause = useCallback(() => {
    setIsPaused((p) => !p);
  }, []);

  // Replay last stream
  const replay = useCallback(async () => {
    if (!lastTextRef.current) return;
    await startSession();
    await streamText(lastTextRef.current);
  }, [startSession, streamText]);

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
    streamText,
    finishSession,
    togglePlayPause,
    replay,
    reset,
    clearError,
  };
}
