# Anticipatory Commerce Agent — System Design

**Version:** 2.1 (Revised Architecture & Two-Agent Integration Contract)  
**Date:** 2026-11-19  
**Status:** Ready for parallel implementation by Person A & Person B

## Changelog (v1.0 → v2.1)

| Area | Gap in v1.0 | Fix in v2.1 |
|---|---|---|
| **Scoring & Search Math** | Claimed 5–10 searches/request is cheap; target `Score ≥ 40` at `Acc ≥ 0.55` is mathematically impossible | Derived EV breakeven for commits; cut search target to 1.5–2.5/request; aligned targets (`Acc ≥ 0.78` for `Score ≥ 40`) |
| **Commit Policy** | Uncalibrated additive weights (`0.85` threshold) despite 35% of dev having corrections/late constraints | EV-based calibrated probability gate + stability cooldown + commit-once discipline |
| **Streaming Extractor** | No handling for multi-word lookahead, number disambiguation (`size` vs `price`), negation, or `query` construction | Added incremental token buffer, category-size compatibility, safe fuzzy matching (`len ≥ 5`), and residual query builder |
| **Hinglish Processing** | Stripped boundary cues (`please`/`thanks`) as stopwords; missed spelling variants, fractions (`dedh`/`dhai`), colours, and Hindi corrections | Keep boundary cues for confidence engine; expanded Romanized Hinglish normalization and correction triggers |
| **API & State Contract** | Contradicted stateful endpoints with "stateless agent"; omitted `ProductSummary`, session TTL, and ordering guards | Defined `SessionManager` with TTL/locking, enriched responses with `ProductSummary` + top candidates, moved contract freeze to Phase 0 |
| **Two-Agent Handoff** | Missing exact base URL, route table, JSON casing, error envelope, WS framing, and strict folder ownership | Added Section 5.5 pinning exact routes, `snake_case` wire format, error JSON, WS payload, and per-agent write boundaries |
| **Validation & Fallbacks** | Risk of overfitting all 300 dev samples; unspecified relaxation order on 0 results | Added stratified train/holdout split, error taxonomy script, and ordered filter-relaxation ladder |

## 1. Data & Scoring Analysis

### 1.1 Catalogue (`catalogue.csv`)

| Property | Value |
|---|---|
| **Products** | 1,074 rows (each size = separate row) |
| **Categories** | 16 (`running shoes`, `sneakers`, `sandals`, `t-shirts`, `shirts`, `hoodies`, `jackets`, `track pants`, `jeans`, `kurtas`, `dresses`, `caps`, `backpacks`, `wallets`, `watches`, `headphones`) |
| **Colours** | 16 (`black`, `white`, `navy`, `blue`, `grey`, `green`, `red`, `brown`, `beige`, `olive`, `maroon`, `pink`, `tan`, `yellow`, `gold`, `silver`) |
| **Brands** | 18 unique (`Strydo`, `Kudova`, `Loomsy`, `Urbanyx`, `Pacevo`, `Zentrail`, `Northweft`, `Tanaro`, `Carrafel`, `Horavo`, `Sonquil`, `Wavlo`, `Kesar Loom`, `Mehrin`, `Tikkra`, `Packwise`, `Ledgerly`, `Audora`) — *verify exact count programmatically from `catalogue.csv` in Phase 0* |
| **Sizes** | Mixed by category: Apparel (`XS`–`XXL`), Footwear (`UK 6`–`11`), Bottoms (`28`–`34`), Accessories (one-size / none) |
| **Price Range** | ₹350 – ₹8,899 (mean ~₹2,304) |
| **Ambiguity** | Multiple products share `(category, colour, brand, size)`; price and description tokens (`casual`, `leather`, `wireless`, `slim`) disambiguate |

**Evaluation Integrity Rule:** `catalogue_index.py` may load `catalogue.csv` solely to build static vocabularies (canonical categories, brands, colours, valid sizes per category). All product retrieval and ranking must go through `search.py` (with `tools.record_search()` tracked) so the agent never bypasses the evaluation harness.

### 1.2 Development Set (`dev.jsonl`) — 300 Requests

| Tag | Count | Share | Characteristics |
|---|---|---|---|
| `plain` | ~175 | ~58% | Straightforward slot accumulation |
| `correction` | 55 | 18.3% | Mid-request reversals (`"black — no wait, white"`, `"size M... oops XS"`) |
| `late_constraint` | 50 | 16.7% | Constraints arriving after request sounds complete (`"oh, and in blue"`, `"one more thing, large"`) |
| `code_mixed` | 25 | 8.3% | Hindi–English (`"mujhe Loomsy green casual shoes size eight chahiye"`, `"kya aapke paas Loomsy shirt 2000 tak"`) |

*Note:* Tag counts sum to >300 because tags can overlap (e.g., `code_mixed` + `correction` or `late_constraint`). Every pipeline stage must handle compound tags.

- **Word-length stats:** Mean ~14 words (range 8–19); mean optimal commit point (`earliest`) ~11 words (~75% through request).
- **Risk implication:** Roughly **35%** of requests contain either a correction or a late constraint. Any naive "commit as soon as 1 search result appears" rule will incur heavy `-1.0` penalties.

### 1.3 Scoring Formula & Expected-Value Economics (`evaluate.py`)

```text
score = (0.4 + 0.6 * earliness)  if final_answer_correct else 0
        - 1.0 * wrong_commits
        - 0.02 * min(wasted_searches, 10)

earliness       = words_remaining_when_first_committed_target / total_words
wasted_searches = max(0, searches_performed - 1)
```

Three mathematical consequences govern the entire design:

1. **Accuracy is the primary lever, not earliness.**
   - At 55% accuracy and 0.25 earliness with 0 wrong commits and 0 wasted searches, the theoretical ceiling is `0.55 * (0.4 + 0.15) = 0.3025` (~30.3/100) — nowhere near 40.
   - Reaching **≥ 40/100** requires pushing final accuracy to **≥ 78–82%** (via strong extraction, synonyms, Hinglish, corrections, and residual query disambiguation) *and* keeping wasted searches low.
2. **Wasted searches are NOT cheap at high counts.**
   - Doing 8 searches/request (`7` wasted) costs `-0.14` on **every** request (correct or wrong). That wipes out almost the entire earliness bonus (`+0.15` at `e = 0.25`, paid only when correct).
   - **Design rule:** Target **1.5–2.5 searches/request** (penalty `~0.01–0.03`), never 8. Do not search on every word or every new filter; search only when a commit is plausibly near or at `finish()`.
3. **Commit EV breakeven is strict.**
   - Let `p` be the calibrated probability that committing candidate `X` now will match the final target, and `e` be expected earliness. Committing has positive expected value only when:
     `p * (0.6 * e) - (1 - p) * 1.0 > 0  ==>  p > 1 / (1 + 0.6 * e)`
   - At `e = 0.25`, `p` must exceed **0.87** just to break even; at `e = 0.15`, `p` must exceed **0.92**. With safety margin for hidden-test shift, commit only when calibrated `p ≥ 0.94` (tunable via CV).

### 1.4 Search Characteristics (`search.py`)

- **Filters:** Exact, case-insensitive match on `category`, `colour`, `size`, `brand`, `max_price`, `min_price`.
- **Ranking:** Token overlap between `query` and `(title, brand, category, colour, size, description)`; ties broken by **cheaper price**.
- **Critical implication:** Leaving `query` empty discards description/title matching (`casual`, `running`, `wireless`, `leather`, `polo`, `high-top`). The extractor must pass **residual non-filter content words** into `query` to break ties accurately.

## 2. System Architecture

### 2.1 Three-Layer Streaming Pipeline

```text
Incoming word(t)
   │
   ▼
[1. Normalizer & Hinglish Layer]
   • Preserves raw token stream + boundary cues (please/thanks/chahiye)
   • Produces normalized tokens + Hindi-to-English mappings
   │
   ▼
[2. Incremental Extractor (Sliding Buffer + Slot State)]
   • Multi-word matcher (brands, categories, compound numbers, price phrases)
   • Number disambiguator (size vs price via context + category-size map)
   • Correction & negation tracker (versioned FilterState)
   • Residual content-word collector (for search.py `query` parameter)
   │
   ▼
[3. Search & Commit Orchestrator]
   • Lazy SearchController (cache + trigger gate + hard budget cap)
   • Calibrated ConfidenceEngine (EV threshold + cooldown + stability check)
   • Commit-once policy + finish() verification & relaxation ladder
```

### 2.2 Layer 1: Incremental Extractor

#### Streaming Multi-Word & Pending-Number Buffer

Because `observe()` receives one word at a time, eager single-word matching fails on multi-word entities (`running shoes`, `track pants`, `Kesar Loom`, `forty five hundred`, `under 4k`, `no wait`, `ke andar`).

- Maintain a **token window** of all tokens seen so far (`tokens[0..t]`) and a **pending phrase buffer** (up to 4 tokens).
- **Greedy longest-match:** Check 3-gram → 2-gram → 1-gram against canonical gazetteers (brands, categories, synonyms, correction phrases, price phrases). If a 2-gram (`running shoes`, `Kesar Loom`) completes, supersede any partial 1-gram match (`shoes`).
- **Pending-number hold:** When a number word or digit arrives (`four`, `twenty`, `2`, `8`), hold commitment for 1 token if it can combine with a multiplier (`thousand`, `hundred`, `hazaar`, `sau`, `k`, `tak`, `se kam`). Resolve immediately on the next non-numeric token or at `finish()`.

#### Number Disambiguation (`size` vs `price`)

| Signal | Interpretation | Example |
|---|---|---|
| Preceded by `under`/`below`/`max`/`budget`/`₹`/`rs` or followed by `k`/`tak`/`ke andar`/`hundred`/`thousand`/`hazaar` | `max_price` | `"under 4k"`, `"2000 tak"`, `"forty five hundred"` |
| Preceded by `above`/`over`/`min`/`at least`/`se zyada`/`se upar` | `min_price` | `"above 1500"`, `"2000 se upar"` |
| `"between X and Y"` / `"X to Y"` / `"around X"` | `min_price` & `max_price` (`around X` → `[0.85X, 1.15X]`) | `"around 2k"` → `1700–2300` |
| Preceded by `size`/`uk`/`waist` OR value in active category's valid size set (`6–11` footwear, `28–34` bottoms) | `size` | `"size eight"`, `"UK 9"`, `"waist 32"` |
| Standalone number ≥ 200 without size cue | `max_price` | `"shirt 1500"` |

#### Safe Fuzzy Matching & Category-Size Cross-Validation

- **Strict fuzzy guard:** Only apply edit distance `≤ 1` to tokens with **length ≥ 5** against brand and category vocabularies. Never fuzzy-match short words (`S`, `M`, `L`, `XL`, `red`, `tan`, `cap`) to prevent false positives (`can` → `cap`, `for` → `four`).
- **Category-size compatibility:** Use the catalogue's category-to-size mapping to validate extracted sizes and disambiguate categories (e.g., `waist 32` restricts category to bottoms; `UK 9` restricts to footwear).

#### Negation & Residual Query Construction

- **Negation:** Track `excluded_values` per slot when preceded by `"not"`, `"no"`, `"except"`, `"without"`, `"nahi"` (e.g., `"not black"` prevents `black` from being set as `colour` and filters it out if already set).
- **Residual `query` builder:** Collect non-stopword, non-slot descriptive tokens (`casual`, `formal`, `leather`, `cotton`, `wireless`, `analog`, `slim`, `waterproof`, `high-top`) and pass them to `search.py`'s `query` parameter so description/title overlap breaks ties among identical `(category, colour, brand, size)` SKUs.

### 2.3 Layer 2: Lazy Search Controller

To avoid the `-0.02 * wasted_searches` drain, **do not search on every new filter**.

- **Hard budget:** Default `max_searches = 4` (configurable; target average `1.5–2.5`).
- **Trigger policy (Search Gate):** Fire a mid-stream search only when **all** of the following hold:
  1. Filter signature `(category, colour, size, brand, min_price, max_price, residual_query)` has changed since the last search (cache miss).
  2. Not currently in a correction cooldown or pending-number hold.
  3. At least **3 structured filters** are populated (including `category`), **OR** `word_index ≥ 9` with `≥ 2` structured filters, **OR** an end-of-utterance boundary cue was seen 1+ words ago with `≥ 2` filters.
- **Deduplication:** Cache results keyed by normalized filter + query signature.
- **`finish()` search:** Skip calling `search()` in `finish()` if the final filter/query signature is identical to the last cached search! This alone saves 1 search on every request where no late constraint arrived after the speculative search.

### 2.4 Layer 3: Calibrated Confidence Engine & Commit Policy

Replace hand-tuned additive weights with a **calibrated probability estimator** (regularized logistic regression trained via 5-fold stratified CV on `dev.jsonl` using out-of-fold predictions) combined with hard safety guards.

#### Features for `P(top_1 == final_target | state)`

| Feature | Rationale |
|---|---|
| `result_count` (`1`, `2–3`, `4+`) | Unique match is the strongest signal |
| `top1_score_margin` | Gap between #1 and #2 search scores when `result_count > 1` |
| `num_filters` & slot flags (`has_category`, `has_brand`, `has_size`, `has_colour`, `has_price`) | Completeness of user specification |
| `word_index` | Progress through typical 8–19 word request |
| `words_since_last_slot_change` | Hysteresis / stability (guards against mid-phrase commits) |
| `correction_seen` & `words_since_correction` | Corrections signal higher volatility |
| `boundary_cue_seen` | Politeness/closure words (`please`, `thanks`, `chahiye`, `milega`) |
| `is_code_mixed` | Accounts for higher parsing uncertainty in Hinglish |

#### Hard Safety Guards (All Must Pass Before Committing)

1. **Unique or decisive match:** `result_count == 1` (Phase 2 strict mode; optionally test `result_count ≤ 2` with high score margin in Phase 6).
2. **Calibrated EV gate:** `P_calibrated ≥ commit_threshold` (default `0.94`, tuned via CV to achieve **0 wrong commits** on out-of-fold dev).
3. **Correction cooldown:** At least **4 words** elapsed since the last correction marker or slot reversal.
4. **Pending-number clear:** No unresolved numeric/multi-word token in the buffer.
5. **Commit-once discipline:** Once the agent commits a `product_id`, set `has_committed = True` and do **not** emit a second speculative commit mid-stream (avoid stacking `-1.0` penalties). If a later correction invalidates the committed product, update state silently and return the corrected product in `finish()`.

### 2.5 Approach Trade-offs

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **LLM per word** | Strong paraphrase/Hinglish handling | High latency, cost, non-deterministic, hard to guarantee 0 wrong commits | Rejected |
| **Pure rules + hand-tuned weights** | Fast (<2ms), deterministic | Uncalibrated confidence; brittle commit threshold | Base extractor only |
| **Deterministic Extractor + Calibrated Tabular Gate (LogReg)** | <5ms/word p95, deterministic extraction, mathematically calibrated commit probabilities, low overfitting risk on 300 samples | Requires curated synonym/Hinglish maps | **Selected** |
| **Fine-tuned Transformer / End-to-End RL** | Could learn phrasing end-to-end | 300 samples far too small; high overfitting risk on hidden test | Rejected |

## 3. Zero-Wrong-Commit, Correction & Fallback Strategy

### 3.1 Versioned Filter State

```python
@dataclass
class FilterValue:
    value: Union[str, int]
    confidence: float
    word_index: int
    provenance: List[str]
    source_lang: str = "en"  # "en" | "hi" | "mixed"
    superseded_by: Optional["FilterValue"] = None

@dataclass
class FilterState:
    category: Optional[FilterValue] = None
    colour: Optional[FilterValue] = None
    size: Optional[FilterValue] = None
    brand: Optional[FilterValue] = None
    max_price: Optional[FilterValue] = None
    min_price: Optional[FilterValue] = None
    excluded: Dict[str, Set[str]] = field(default_factory=dict)
    residual_tokens: List[str] = field(default_factory=list)
    version: int = 0
    last_correction_word: Optional[int] = None
```

### 3.2 Correction Handling (Explicit & Implicit)

- **Explicit markers (EN + Hinglish):** `oops`, `sorry`, `no wait`, `wait`, `actually`, `i mean`, `make that`, `change that to`, `instead`, `not`, `nahi`, `nahi nahi`, `galti se`, `badal do`.
- **Implicit slot reversal:** If a new valid value arrives for an already-populated slot (e.g., `colour=black` then `white` without `"and"` between them), treat it as a correction, supersede the old `FilterValue`, increment `version`, and set `last_correction_word = word_index`.
- **False-positive guard:** Ignore `"black and white"` (conjunction `"and"`/`"or"`/`"ya"`) as a correction; keep primary colour and add secondary colour to `residual_tokens`.
- **Cooldown:** Block both speculative searches and commits for 3–4 words after `last_correction_word` (unless `finish()` is called).

### 3.3 Late Constraint & `finish()` Relaxation Ladder

When `finish()` is called:

1. Flush any pending numeric/phrase buffer.
2. Run final search **only if** the current filter/query signature is not already cached.
3. **If results == 0**, execute an ordered relaxation ladder (stopping as soon as ≥ 1 result is returned, respecting remaining search budget):
   - **Step 1:** Drop `residual_tokens` (`query=""`) — keeps all structured filters intact.
   - **Step 2:** Relax `max_price` by `+15%` (and drop `min_price` if set) — handles `"around"` or slight budget overshoot.
   - **Step 3:** Drop lowest-confidence non-core filter among `{colour, brand}` (never drop `category` or `size` first).
   - **Step 4:** Drop the other of `{colour, brand}`.
   - **Step 5:** Drop `max_price` completely, keeping `(category, size)`.
   - **Step 6:** Fallback to `category` + `residual_tokens` only.
4. **If results > 1**, pick rank-1 from `search.py` (which uses residual-query overlap + cheaper tie-break).

## 4. Hinglish / Code-Mixed Strategy

### 4.1 Preserve Boundary Cues; Normalize Only Downstream

- **Do NOT strip** `please`, `thanks`, `chahiye`, `milega`, `dikhao` before the Confidence Engine sees them — they are valuable end-of-utterance signals. Strip them only when building `residual_tokens` for `search.py`.

### 4.2 Normalization & Lexical Maps

| Component | Coverage |
|---|---|
| **Intent / Stopwords** (query-stripped only) | `kya`, `aapke`, `paas`, `milega`, `mil`, `jayega`, `chahiye`, `mujhe`, `mera`, `hai`, `ho`, `dikhao`, `dikhaiye`, `batao`, `wala`, `wali`, `mein`, `me`, `ka`, `ki`, `ke`, `ek` (when article, not number) |
| **Number words + spelling variants** | `ek`→1, `do`→2, `teen`/`tin`→3, `chaar`/`char`→4, `paanch`/`panch`→5, `chhah`/`chhe`/`che`→6, `saat`/`sat`→7, `aath`/`ath`→8, `nau`/`no` (context-gated)→9, `das`→10, `gyarah`→11, `baarah`/`barah`→12 ... `bees`→20, `tees`→30, `chaalis`→40, `pachaas`→50, `saath`→60, `sattar`→70, `assi`→80, `nabbe`→90, `sau`/`so`→100, `hazaar`/`hazar`→1000 |
| **Hindi fractional multipliers** | `dedh hazaar`→1500, `dhai hazaar`→2500, `sava hazaar`→1250, `saade X hazaar`→`(X + 0.5) * 1000`, `saade X sau`→`(X + 0.5) * 100` |
| **Budget expressions** | `tak`, `ke andar`, `ke neeche`, `se kam` → `max_price`; `se zyada`, `se upar` → `min_price`; `ke beech` → range |
| **Hindi colours** | `kaala`/`kala`→`black`, `safed`→`white`, `neela`/`nila`→`blue`, `laal`/`lal`→`red`, `hara`→`green`, `peela`/`pila`→`yellow`, `bhoora`/`bhura`→`brown`, `gulabi`→`pink` |
| **Category synonyms** | `joote`/`joota`/`jute`→shoes (disambiguate sneakers vs running shoes via context), `chappal`/`slides`/`floaters`→`sandals`, `ghadi`→`watches`, `baig`/`bag`→`backpacks`, `kurti`/`kurta`→`kurtas`, `joggers`/`trackpants`/`lower`→`track pants`, `tee`/`tshirt`→`t-shirts`, `runners`→`running shoes` |
| **Correction markers** | `nahi`, `nahi nahi`, `galti se`, `sorry`, `badal do`, `change karo` |

## 5. Repo Structure, API Contract & Parallel Team Workflow

### 5.1 Directory Layout

```text
anticipatory-commerce/
├── agent/                      # Person A: Core agent
│   ├── __init__.py
│   ├── agent.py                # Main Agent class (evaluate.py interface)
│   ├── extractor.py            # Streaming buffer, slot extraction, residual query
│   ├── confidence.py           # Calibrated ConfidenceEngine + EV commit gate
│   ├── search_controller.py    # Lazy search gate, caching, budget enforcement
│   ├── filters.py              # Versioned FilterState & FilterValue dataclasses
│   ├── hinglish.py             # Hinglish normalizer, number/fraction parser
│   ├── catalogue_index.py      # Static vocab + category-size map from catalogue.csv
│   ├── config.py               # Tunable parameters & model weights
│   └── tests/
│       ├── test_extractor.py
│       ├── test_hinglish.py
│       ├── test_corrections.py
│       ├── test_confidence.py
│       └── test_integration.py
├── scripts/                    # Person A: Offline eval & calibration
│   ├── split_dev.py            # Stratified train/holdout split
│   ├── calibrate_confidence.py # 5-fold CV logistic regression calibration
│   └── analyze_errors.py       # Error taxonomy breakdown
├── api/                        # Person A: Stateful FastAPI wrapper
│   ├── __init__.py
│   ├── main.py                 # FastAPI app + CORS + lifespan
│   ├── schemas.py              # Single source of truth (Pydantic v2)
│   ├── session_manager.py      # In-memory request_id -> AgentSession + TTL + locks
│   ├── generate_contract.py    # Exports shared/api_contract.json
│   └── routes/
│       ├── agent.py            # POST /agent/start, /observe, /finish; GET /products/{id}
│       └── health.py
├── frontend/                   # Person B: React + Vite UI & voice demo
│   └── src/
│       ├── types/api.ts        # Mirrors api/schemas.py (snake_case, generated from contract)
│       ├── hooks/              # useAgent.ts (sequential queue), useVoice.ts
│       └── components/         # ChatPanel, ProductCard, FilterChips, ConfidenceMeter
├── shared/
│   └── api_contract.json       # Frozen in Phase 0
├── data/                       # catalogue.csv, dev.jsonl
├── evaluate.py                 # Unmodified starter kit
├── search.py                   # Unmodified starter kit
└── DESIGN.md
```

### 5.2 API Contract (`api/schemas.py`) — Freeze in Phase 0

```python
from pydantic import BaseModel, Field
from typing import Optional, List, Union
from enum import Enum

class FilterKey(str, Enum):
    CATEGORY = "category"
    COLOUR = "colour"
    SIZE = "size"
    BRAND = "brand"
    MAX_PRICE = "max_price"
    MIN_PRICE = "min_price"

class FilterValue(BaseModel):
    value: Union[str, int]
    confidence: float = Field(ge=0.0, le=1.0)
    word_index: int
    provenance: List[str]

class FilterState(BaseModel):
    category: Optional[FilterValue] = None
    colour: Optional[FilterValue] = None
    size: Optional[FilterValue] = None
    brand: Optional[FilterValue] = None
    max_price: Optional[FilterValue] = None
    min_price: Optional[FilterValue] = None
    residual_tokens: List[str] = Field(default_factory=list)
    version: int = 0

class ProductSummary(BaseModel):
    product_id: str
    title: str
    brand: str
    category: str
    colour: str
    size: str
    price: int

class StartRequest(BaseModel):
    request_id: str

class StartResponse(BaseModel):
    status: str = "ready"
    request_id: str

class ObserveRequest(BaseModel):
    request_id: str
    word: str
    word_index: int = Field(ge=1)
    is_final: bool = False

class ObserveResponse(BaseModel):
    commit: Optional[str] = None
    committed_product: Optional[ProductSummary] = None
    top_candidates: List[ProductSummary] = Field(default_factory=list)
    filters: FilterState
    confidence: float = Field(ge=0.0, le=1.0)
    searches_used: int
    searches_remaining: int
    reason: str

class FinishRequest(BaseModel):
    request_id: str

class FinishResponse(BaseModel):
    product_id: Optional[str] = None
    product: Optional[ProductSummary] = None
    filters: FilterState
    confidence: float = Field(ge=0.0, le=1.0)
    searches_used: int

class ErrorResponse(BaseModel):
    error_code: str
    detail: str
```

### 5.3 Backend State, Ordering & Error Semantics

- **Session lifecycle:** `SessionManager` stores `request_id → (Agent, asyncio.Lock, last_active_ts)` with a 10-minute TTL background sweep. Each `Agent` instance is isolated per request (no cross-request leakage), sharing only a read-only `CatalogueIndex` singleton.
- **Ordering safety:** Frontend `useAgent.ts` queues `/agent/observe` calls sequentially (or uses WebSocket for voice); backend enforces per-session lock and rejects out-of-order `word_index` with `409 Conflict`.
- **Error codes:** `404` unknown `request_id` or `product_id`; `409` duplicate `/start`, out-of-order `word_index`, or `/observe` after `/finish`; `422` schema validation.
- **CORS:** Allow Vite dev origin (`http://localhost:5173`) in development.

### 5.4 Parallel Work Rules (Unblocking Person B on Day 1)

- **Phase 0 contract freeze:** Person A commits `api/schemas.py`, `shared/api_contract.json`, and a minimal stub FastAPI server returning mocked `ObserveResponse` on Day 1 so Person B can build and test the entire UI immediately.
- **Contract changes:** Any schema update requires regenerating `shared/api_contract.json` via `python -m api.generate_contract` and notifying Person B before merge.

### 5.5 Two-Agent Handoff & Integration Contract

Use this section verbatim when briefing Person A's and Person B's coding agents so both sides integrate cleanly without coordination drift.

#### Wire Protocol & Exact Endpoints

- **Dev base URL:** `http://localhost:8000` (frontend reads `VITE_API_BASE_URL`, defaulting to `http://localhost:8000`; no `/api` prefix).
- **JSON casing:** Strict **`snake_case`** everywhere in requests, responses, and `frontend/src/types/api.ts` (never convert to `camelCase`).
- **Error envelope:** All non-2xx responses return `ErrorResponse` (`{"error_code": "...", "detail": "..."}`).

| Method | Exact Path | Request Body / Params | Response Schema |
|---|---|---|---|
| `GET` | `/health` | — | `{"status": "ok"}` |
| `POST` | `/agent/start` | `StartRequest` | `StartResponse` |
| `POST` | `/agent/observe` | `ObserveRequest` | `ObserveResponse` |
| `POST` | `/agent/finish` | `FinishRequest` | `FinishResponse` |
| `GET` | `/products/{product_id}` | Path param `product_id` | `ProductSummary` |
| `WS` (stretch) | `/agent/stream` | JSON frames: `{"type": "start", "payload": StartRequest}` \| `{"type": "observe", "payload": ObserveRequest}` \| `{"type": "finish", "payload": FinishRequest}` | JSON frames: `{"type": "start_ack" \| "observe" \| "finish" \| "error", "payload": ...}` |

#### Strict Directory Ownership (Coding Agent Guardrails)

| Owner | Writable Paths | Read-Only / Do Not Edit |
|---|---|---|
| **Person A (Backend & Agent)** | `agent/`, `api/`, `scripts/`, `shared/api_contract.json`, `pyproject.toml`, `requirements.txt` | `frontend/`, `evaluate.py`, `search.py`, `data/` |
| **Person B (Frontend & Voice UI)** | `frontend/` | `agent/`, `api/`, `scripts/`, `shared/api_contract.json`, `evaluate.py`, `search.py`, `data/` |

#### Day 1 Sync Checkpoint (Before Going Fully Independent)

1. Person A pushes the Phase 0 commit containing `api/schemas.py`, `shared/api_contract.json`, and a runnable stub server (`uvicorn api.main:app --port 8000`) returning valid mocked `StartResponse`, `ObserveResponse`, `FinishResponse`, and `ProductSummary` payloads.
2. Person B pulls `main`, creates `frontend/src/types/api.ts` matching `api/schemas.py` field-for-field in `snake_case`, and builds against `http://localhost:8000` (with an optional local mock toggle in `useAgent.ts` for offline UI work).
3. Neither side changes an endpoint path, status code, or field name in Section 5.2/5.5 without updating `DESIGN.md` and `shared/api_contract.json` first.

## 6. Phased Build Plan

### Phase 0: Scaffold, Baseline & Contract Freeze (Day 1)

- [ ] Repo layout, `pyproject.toml`, `requirements.txt`, starter kit copied to `data/`
- [ ] Run baseline (`python evaluate.py`) and record exact baseline metrics per tag
- [ ] Create stratified dev split (`scripts/split_dev.py`: 200 tune / 100 frozen local holdout)
- [ ] Implement `catalogue_index.py` (canonical vocabs + category-to-size map; verify exact brand count)
- [ ] Freeze `api/schemas.py`, export `shared/api_contract.json`, and stand up stub API on port `8000` for Person B

### Phase 1: High-Accuracy Extraction & Residual Query (Days 1–2)

- [ ] Implement `filters.py` and `extractor.py` (multi-word sliding buffer, pending-number hold, price/size disambiguation, safe fuzzy match `len ≥ 5`, negation, residual query builder)
- [ ] Implement `hinglish.py` (Romanized variants, fractions, Hindi colours, budget/correction cues while preserving boundary tokens)
- [ ] Implement `scripts/analyze_errors.py` and evaluate **finish-only accuracy** (0 earliness, 1 search) on the 200-sample tune split — **gate: accuracy ≥ 75% before adding early commits**

### Phase 2: Corrections & Relaxation Ladder (Day 2–3)

- [ ] Explicit + implicit correction detection, conjunction guard (`"black and white"`), slot versioning
- [ ] Implement `finish()` 6-step relaxation ladder for 0-result queries
- [ ] Unit tests for `correction`, `late_constraint`, `code_mixed`, and compound cases

### Phase 3: Lazy Search Controller & Calibrated Commit Gate (Days 3–4)

- [ ] Implement `search_controller.py` (search trigger gate, signature caching, hard budget `max_searches=4`, skip redundant `finish()` search)
- [ ] Train and calibrate `confidence.py` via 5-fold CV on the 200-sample tune split (`scripts/calibrate_confidence.py`)
- [ ] Enforce hard safety guards (unique match, EV threshold, 4-word correction cooldown, commit-once)
- [ ] Verify **0 wrong commits** and avg searches `≤ 2.5` on tune split

### Phase 4: Real FastAPI Integration & Frontend Wiring (Day 4–5)

- [ ] Implement `session_manager.py` (TTL, per-session locks, status codes) and wire real `Agent` into `api/routes/agent.py`
- [ ] Add `GET /products/{product_id}` and enrich responses with `ProductSummary` + `top_candidates`
- [ ] Person B connects real endpoints to `ChatPanel`, `FilterChips`, `ConfidenceMeter`, `ProductCard` (and optional `WS /agent/stream` for voice)

### Phase 5: Holdout Validation, Tuning & Stress Testing (Day 5–6)

- [ ] Single-shot evaluation on the **100-sample frozen local holdout** (never tuned on) to verify generalization
- [ ] Per-tag audit (`plain`, `correction`, `late_constraint`, `code_mixed`) — ensure zero wrong commits and no tag below baseline
- [ ] Synthetic adversarial tests (typos, double corrections, Hindi fractions, out-of-budget queries)
- [ ] Latency profiling (target `< 10 ms/word` p95; hard ceiling `< 50 ms/word`)

## 7. Resolved Design Decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | **Synonym & Hinglish handling** | Deterministic gazetteer + normalized Hinglish map (no transformer) | <2ms latency, deterministic, 300 samples too small for transformer fine-tuning |
| 2 | **Search budget default** | `max_searches = 4` (target avg `1.5–2.5`) | 8 searches costs `-0.14`/request and erases earliness gains |
| 3 | **Commit threshold** | Calibrated probability `≥ 0.94` (EV-derived, CV-tuned) | Matches `-1.0` vs `+0.6e` asymmetry; protects against 35% correction/late-constraint rate |
| 4 | **Commit-once vs re-commit** | Commit at most once mid-stream | Prevents stacked `-1.0` penalties if a late correction arrives |
| 5 | **0-result fallback at `finish()`** | Ordered 6-step relaxation ladder (residual query → price → colour/brand → category+size) | Preserves core intent (`category`, `size`) rather than dropping them blindly |
| 6 | **API statefulness** | Stateful `SessionManager` per `request_id` (10-min TTL) + shared read-only `CatalogueIndex` | Matches `/start` → `/observe` → `/finish` protocol cleanly without cross-request leakage |
| 7 | **Frontend contract timing** | Freeze `api/schemas.py` + stub server in Phase 0 | Unblocks Person B on Day 1 instead of Day 5 |
| 8 | **Overfitting control** | 200 tune / 100 frozen holdout + 5-fold CV for calibration | Prevents memorizing `dev.jsonl` phrasing before hidden test |

## 8. Success Criteria (Mathematically Consistent Targets)

Assuming `score` is reported on a 0–100 scale (`mean_request_score * 100`):

| Metric | Baseline | v2.1 Target | Math Check |
|---|---|---|---|
| **Final Accuracy (holdout)** | ~52.7% | **≥ 78%** | Primary driver: `0.78 * 0.40 = 31.2` before earliness |
| **Wrong Commits (holdout)** | 0 | **0** (hard ceiling ≤ 1%) | Each wrong commit costs `-1.0` per request |
| **Mean Earliness (holdout)** | 0.00 | **≥ 0.22** | Adds `0.78 * 0.6 * 0.22 = +10.3` points |
| **Avg Searches / Request** | 1.0 | **≤ 2.5** (`max = 4`) | Wasted search cost `≤ 1.5 * 0.02 = -3.0` points |
| **Net Score (holdout)** | ~20.0 | **≥ 38–42** | `31.2 + 10.3 - 3.0 = 38.5` (42+ at 82% acc / 2.0 searches) |
| **Latency p95** | — | **< 10 ms/word** | Hard ceiling `< 50 ms/word` |
| **Per-Tag Accuracy** | — | **Every tag ≥ 70%** | No single tag drags overall score |

## Appendix: Key Test Matrix (Dev Patterns + Edge Cases)

| Pattern | Example / Case | Expected Behavior |
|---|---|---|
| Basic accumulation | `dev-0001` (`"forty five hundred"`) | Hold pending number until `"hundred"`; parse `4500`; commit only after calibrated gate passes |
| Colour/size correction | `dev-0003`, `dev-0031`, `dev-0041` | Detect marker, supersede slot, enter 4-word cooldown, suppress premature commit |
| Conjunction (non-correction) | `"black and white sneakers"` | Do NOT trigger correction; retain primary colour + pass secondary to `residual_tokens` |
| Late constraint | `dev-0006`, `dev-0010`, `dev-0043` | Do not commit eagerly on `"please"`/`"thanks"`; absorb late slot; skip redundant `finish()` search if unchanged |
| Hinglish numbers & budget | `dev-0024` (`"eight"`), `dev-0048` (`"2000 tak"`), `"dedh hazaar"` | Parse `8`→size, `2000 tak`→`max_price=2000`, `dedh hazaar`→`1500` |
| Budget notation | `dev-0004` (`"0.8k"`), `dev-0027` (`"4k"`), `"around 2k"` | Parse `800`, `4000`, and range `1700–2300` |
| Category synonyms | `dev-0002` (`"slides"`), `dev-0004` (`"floaters"`), `dev-0012` (`"runners"`) | Map to `sandals`, `sandals`, `running shoes` |
| Residual disambiguation | Identical `(category, colour, brand, size)` SKUs | Pass `"casual"`, `"leather"`, `"wireless"` in `query` to break ties accurately |
| 0-result fallback | Over-constrained query at `finish()` | Traverse 6-step relaxation ladder without dropping `category` first |
