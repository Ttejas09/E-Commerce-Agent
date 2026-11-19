// useAgent — manages the full agent session lifecycle
// Supports HTTP sequential queue & WebSocket streaming
// Tracks word-by-word timeline and calculates live evaluation score

import { useState, useCallback, useRef } from "react";
import type {
  AgentState,
  ObserveResponse,
  FinishResponse,
  TransportMode,
  TimelineEvent,
  SessionScore,
  ProductSummary,
} from "../types/api";
import { INITIAL_AGENT_STATE } from "../types/api";
import { agentStart, agentObserve, agentFinish } from "../lib/api";
import { mockStart, mockObserve, mockFinish } from "../lib/mock";
import { AgentWebSocketClient } from "../lib/ws";

function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Scoring constants from evaluate.py
const W_CORRECT = 0.4;
const W_EARLY = 0.6;
const P_WRONG = 1.0;
const P_WASTE = 0.02;

function calculateScore(
  totalWords: number,
  commitWord: number | null,
  finalProduct: ProductSummary | null,
  targetId: string | null,
  searches: number,
  commits: { wordIndex: number; id: string }[],
): SessionScore {
  const isCorrect = targetId ? finalProduct?.product_id === targetId : true;
  const wrongCommits = targetId
    ? commits.filter((c) => c.id !== targetId).length
    : 0;

  const firstRightCommit = targetId
    ? commits.find((c) => c.id === targetId)?.wordIndex ?? null
    : commitWord;

  const wordsSaved =
    isCorrect && wrongCommits === 0 && firstRightCommit !== null
      ? totalWords - firstRightCommit
      : 0;

  const earlinessShare = totalWords > 0 ? wordsSaved / totalWords : 0;
  const wastedSearches = Math.max(0, searches - 1);

  const rawScore =
    (isCorrect ? W_CORRECT + W_EARLY * earlinessShare : 0) -
    P_WRONG * wrongCommits -
    P_WASTE * Math.min(wastedSearches, 10);

  const scaledScore = Math.max(0, Math.round(rawScore * 100 * 10) / 10);

  return {
    total_words: totalWords,
    commit_word: firstRightCommit,
    words_saved: wordsSaved,
    earliness_share: earlinessShare,
    wrong_commits: wrongCommits,
    searches,
    wasted_searches: wastedSearches,
    score: scaledScore,
    is_correct: isCorrect,
  };
}

export function useAgent(useMock = false) {
  const [state, setState] = useState<AgentState>(INITIAL_AGENT_STATE);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const abortRef = useRef<boolean>(false);
  const wsClientRef = useRef<AgentWebSocketClient | null>(null);
  const commitsRef = useRef<{ wordIndex: number; id: string }[]>([]);
  const targetIdRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    abortRef.current = true;
    if (wsClientRef.current) {
      wsClientRef.current.close();
      wsClientRef.current = null;
    }
    commitsRef.current = [];
    targetIdRef.current = null;
    setState(INITIAL_AGENT_STATE);
  }, []);

  const setTransport = useCallback((mode: TransportMode) => {
    setState((s) => ({ ...s, transport: mode }));
  }, []);

  const setExpectedTarget = useCallback((target: string | null) => {
    targetIdRef.current = target;
  }, []);

  // Start a new request session
  const startSession = useCallback(async () => {
    reset();
    abortRef.current = false;
    const request_id = generateRequestId();

    setState((s) => ({
      ...s,
      phase: "listening",
      request_id,
      words: [],
      word_index: 0,
      timeline: [],
      scoring: null,
      error: null,
    }));

    try {
      if (useMock) {
        await mockStart(request_id);
      } else if (state.transport === "ws") {
        const client = new AgentWebSocketClient();
        await client.start({ request_id });
        wsClientRef.current = client;
      } else {
        await agentStart({ request_id });
      }
    } catch (err: unknown) {
      setState((s) => ({
        ...s,
        phase: "error",
        error: err instanceof Error ? err.message : String(err),
      }));
    }

    return request_id;
  }, [useMock, state.transport, reset]);

  // Send a single word
  const sendWord = useCallback(
    (word: string): Promise<ObserveResponse | null> => {
      return new Promise((resolve) => {
        queueRef.current = queueRef.current.then(async () => {
          if (abortRef.current) {
            resolve(null);
            return;
          }

          let currentState: AgentState | null = null;
          setState((s) => {
            currentState = s;
            return s;
          });
          if (!currentState) {
            resolve(null);
            return;
          }

          const s = currentState as AgentState;
          if (
            (s.phase !== "listening" && s.phase !== "committed") ||
            !s.request_id
          ) {
            resolve(null);
            return;
          }

          const newIndex = s.word_index + 1;
          const newWords = [...s.words, word];

          try {
            let response: ObserveResponse;
            if (useMock) {
              response = await mockObserve(word, newIndex);
            } else if (s.transport === "ws" && wsClientRef.current) {
              response = await wsClientRef.current.observe({
                request_id: s.request_id!,
                word,
                word_index: newIndex,
                is_final: false,
              });
            } else {
              response = await agentObserve({
                request_id: s.request_id!,
                word,
                word_index: newIndex,
                is_final: false,
              });
            }

            const events: TimelineEvent[] = [];
            const timestamp = Date.now();

            // Check if commit happened
            const newCommit = response.commit && !s.committed_product;
            if (newCommit) {
              commitsRef.current.push({
                wordIndex: newIndex,
                id: response.commit!,
              });
              events.push({
                id: `commit-${newIndex}`,
                word_index: newIndex,
                word,
                type: "commit",
                description: `Committed product ${response.commit} (${response.committed_product?.title})`,
                confidence: response.confidence,
                timestamp,
              });
            }

            // Check if searches incremented
            if (response.searches_used > s.searches_used) {
              events.push({
                id: `search-${newIndex}`,
                word_index: newIndex,
                word,
                type: "search",
                description: `Executed search #${response.searches_used} (${response.top_candidates.length} candidates)`,
                confidence: response.confidence,
                timestamp,
              });
            }

            // Standard word observation event
            events.push({
              id: `word-${newIndex}`,
              word_index: newIndex,
              word,
              type: "word",
              description: response.reason || `Parsed word "${word}"`,
              confidence: response.confidence,
              timestamp,
            });

            // Check for superseded slot words (corrections)
            const newlySuperseded: string[] = [];
            const slotKeys = [
              "category",
              "colour",
              "size",
              "brand",
              "max_price",
              "min_price",
            ] as const;

            for (const key of slotKeys) {
              const prevVal = s.filters[key];
              const nextVal = response.filters[key];
              if (
                prevVal &&
                nextVal &&
                String(prevVal.value).toLowerCase() !==
                  String(nextVal.value).toLowerCase()
              ) {
                newlySuperseded.push(...prevVal.provenance);
                events.push({
                  id: `correction-${newIndex}-${key}`,
                  word_index: newIndex,
                  word,
                  type: "correction",
                  description: `Correction in ${key}: "${prevVal.value}" → "${nextVal.value}"`,
                  confidence: response.confidence,
                  timestamp,
                });
              }
            }

            const updatedSuperseded = Array.from(
              new Set([...s.superseded_words, ...newlySuperseded]),
            );

            setState((prev) => ({
              ...prev,
              words: newWords,
              word_index: newIndex,
              filters: response.filters,
              confidence: response.confidence,
              searches_used: response.searches_used,
              searches_remaining: response.searches_remaining,
              top_candidates: response.top_candidates,
              reason: response.reason,
              timeline: [...prev.timeline, ...events],
              superseded_words: updatedSuperseded,
              is_searching: false,
              ...(newCommit
                ? {
                    phase: "committed" as const,
                    committed_product: response.committed_product,
                    commit_word_index: newIndex,
                  }
                : {}),
            }));

            resolve(response);
          } catch (err: unknown) {
            setState((prev) => ({
              ...prev,
              phase: "error",
              error: err instanceof Error ? err.message : String(err),
            }));
            resolve(null);
          }
        });
      });
    },
    [useMock],
  );

  // Finish session
  const finishSession = useCallback(async (): Promise<FinishResponse | null> => {
    return new Promise((resolve) => {
      queueRef.current = queueRef.current.then(async () => {
        let currentState: AgentState | null = null;
        setState((s) => {
          currentState = s;
          return s;
        });
        if (!currentState) {
          resolve(null);
          return;
        }

        const s = currentState as AgentState;
        if (!s.request_id) {
          resolve(null);
          return;
        }

        setState((prev) => ({ ...prev, phase: "processing" }));

        try {
          let response: FinishResponse;
          if (useMock) {
            response = await mockFinish();
          } else if (s.transport === "ws" && wsClientRef.current) {
            response = await wsClientRef.current.finish({
              request_id: s.request_id!,
            });
            wsClientRef.current = null;
          } else {
            response = await agentFinish({ request_id: s.request_id! });
          }

          const score = calculateScore(
            s.word_index,
            s.commit_word_index,
            response.product,
            targetIdRef.current,
            response.searches_used,
            commitsRef.current,
          );

          const finishEvent: TimelineEvent = {
            id: `finish-${s.word_index}`,
            word_index: s.word_index,
            word: "[FINISH]",
            type: "finish",
            description: `Session complete. Final target: ${response.product_id} (${response.product?.title})`,
            confidence: response.confidence,
            timestamp: Date.now(),
          };

          setState((prev) => ({
            ...prev,
            phase: "finished",
            filters: response.filters,
            confidence: response.confidence,
            searches_used: response.searches_used,
            final_product: response.product,
            scoring: score,
            timeline: [...prev.timeline, finishEvent],
          }));

          resolve(response);
        } catch (err: unknown) {
          setState((prev) => ({
            ...prev,
            phase: "error",
            error: err instanceof Error ? err.message : String(err),
          }));
          resolve(null);
        }
      });
    });
  }, [useMock]);

  // Stream text word-by-word with optional delay between words
  const streamText = useCallback(
    async (text: string, delayMs: number = 0) => {
      const words = text.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) return;

      for (let i = 0; i < words.length; i++) {
        if (abortRef.current) break;
        await sendWord(words[i]);
        if (delayMs > 0 && i < words.length - 1) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }

      if (!abortRef.current) {
        await finishSession();
      }
    },
    [sendWord, finishSession],
  );

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return {
    state,
    startSession,
    sendWord,
    streamText,
    finishSession,
    reset,
    setTransport,
    setExpectedTarget,
    clearError,
  };
}
