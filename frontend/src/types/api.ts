// API types — mirrors api/schemas.py field-for-field in snake_case
// Generated from shared/api_contract.json v2.1

// ─── Filter Types ───────────────────────────────────────────

export interface FilterValue {
  value: string | number;
  confidence: number;
  word_index: number;
  provenance: string[];
}

export interface FilterState {
  category: FilterValue | null;
  colour: FilterValue | null;
  size: FilterValue | null;
  brand: FilterValue | null;
  max_price: FilterValue | null;
  min_price: FilterValue | null;
  residual_tokens: string[];
  version: number;
}

// ─── Product ────────────────────────────────────────────────

export interface ProductSummary {
  product_id: string;
  title: string;
  brand: string;
  category: string;
  colour: string;
  size: string;
  price: number;
}

// ─── Request / Response Types ───────────────────────────────

export interface StartRequest {
  request_id: string;
}

export interface StartResponse {
  status: string;
  request_id: string;
}

export interface ObserveRequest {
  request_id: string;
  word: string;
  word_index: number;
  is_final: boolean;
}

export interface ObserveResponse {
  commit: string | null;
  committed_product: ProductSummary | null;
  top_candidates: ProductSummary[];
  filters: FilterState;
  confidence: number;
  searches_used: number;
  searches_remaining: number;
  reason: string;
}

export interface FinishRequest {
  request_id: string;
}

export interface FinishResponse {
  product_id: string | null;
  product: ProductSummary | null;
  filters: FilterState;
  confidence: number;
  searches_used: number;
}

export interface ErrorResponse {
  error_code: string;
  detail: string;
}

// ─── WebSocket Frame Types ──────────────────────────────────

export type WSFrameIn =
  | { type: "start"; payload: StartRequest }
  | { type: "observe"; payload: ObserveRequest }
  | { type: "finish"; payload: FinishRequest };

export type WSFrameOut =
  | { type: "start_ack"; payload: StartResponse }
  | { type: "observe"; payload: ObserveResponse }
  | { type: "finish"; payload: FinishResponse }
  | { type: "error"; payload: ErrorResponse };

// ─── Timeline & Scoring ─────────────────────────────────────

export type TimelineEventType = "word" | "filter" | "search" | "commit" | "correction" | "finish";

export interface TimelineEvent {
  id: string;
  word_index: number;
  word: string;
  type: TimelineEventType;
  description: string;
  confidence: number;
  timestamp: number;
}

export interface SessionScore {
  total_words: number;
  commit_word: number | null;
  words_saved: number;
  earliness_share: number;
  wrong_commits: number;
  searches: number;
  wasted_searches: number;
  score: number;
  is_correct: boolean;
}

// ─── Agent State (UI-side) ──────────────────────────────────

export type AgentPhase = "idle" | "listening" | "processing" | "committed" | "finished" | "error";
export type TransportMode = "http" | "ws";

export interface AgentState {
  phase: AgentPhase;
  transport: TransportMode;
  request_id: string | null;
  words: string[];
  word_index: number;
  filters: FilterState;
  confidence: number;
  committed_product: ProductSummary | null;
  commit_word_index: number | null;
  top_candidates: ProductSummary[];
  searches_used: number;
  searches_remaining: number;
  final_product: ProductSummary | null;
  reason: string;
  error: string | null;
  timeline: TimelineEvent[];
  scoring: SessionScore | null;
}

export const EMPTY_FILTER_STATE: FilterState = {
  category: null,
  colour: null,
  size: null,
  brand: null,
  max_price: null,
  min_price: null,
  residual_tokens: [],
  version: 0,
};

export const INITIAL_AGENT_STATE: AgentState = {
  phase: "idle",
  transport: "http",
  words: [],
  word_index: 0,
  request_id: null,
  filters: EMPTY_FILTER_STATE,
  confidence: 0,
  committed_product: null,
  commit_word_index: null,
  top_candidates: [],
  searches_used: 0,
  searches_remaining: 4,
  final_product: null,
  reason: "",
  error: null,
  timeline: [],
  scoring: null,
};
