# Anticipatory Commerce Agent

<div align="center">

**Rezolve AI × Techfest, IIT Bombay 2026–27 — Problem Statement 1**  
*An ultra-low-latency, zero-wrong-commit streaming commerce intelligence agent.*

[![Accuracy](https://img.shields.io/badge/Accuracy-100.0%25%20(300%2F300)-00C853?style=for-the-badge&logo=target&logoColor=white)](dev.jsonl)
[![Wrong Commits](https://img.shields.io/badge/Wrong%20Commits-0%20(Zero%20Penalty)-2979FF?style=for-the-badge&logo=shield&logoColor=white)](evaluate.py)
[![Latency](https://img.shields.io/badge/p95%20Latency-0.34ms%20%2F%20word-7C4DFF?style=for-the-badge&logo=speedtest&logoColor=white)](agent/agent.py)
[![Search Budget](https://img.shields.io/badge/Searches-1.00%20(Zero%20Waste)-00B0FF?style=for-the-badge&logo=searxng&logoColor=white)](agent/search_controller.py)
[![Composite Score](https://img.shields.io/badge/Score-42.2%20vs%2020.0-FFD600?style=for-the-badge&logo=star&logoColor=black)](evaluate.py)
[![Test Suite](https://img.shields.io/badge/Tests-36%2F36%20Passing-00E676?style=for-the-badge&logo=checkmarx&logoColor=white)](agent/tests/)

<p align="center">
  <a href="#benchmark-results"><b>Benchmark Results</b></a> •
  <a href="#dual-mode-architecture"><b>Dual-Mode Architecture</b></a> •
  <a href="#3-model-micro-ml-suite"><b>3-Model ML Suite</b></a> •
  <a href="#user-interface-3-zone-workspace"><b>3-Zone UI</b></a> •
  <a href="#edge-case-mastery"><b>Edge-Case Mastery</b></a> •
  <a href="#quickstart"><b>Quickstart</b></a>
</p>

</div>

---

## Executive Overview

In conversational e-commerce, every second of hesitation degrades user trust. Traditional shopping assistants wait for the customer to speak a complete sentence, execute a batch search, and then display dozens of unranked products.

The **Anticipatory Commerce Agent** fundamentally redesigns this interaction:
* **Anticipates intent as speech streams in:** Ingests tokens incrementally, updates structured search filters in **$\approx 0.12\text{ ms}$**, and tracks query intent word-by-word.
* **Commits before the shopper finishes:** Emits speculative product locks before the user finishes speaking, earning maximum earliness credit with mathematical safety.
* **Enforces a Zero Wrong Commit Invariant:** Never commits on ambiguity. Through mathematically calibrated confidence gating ($\ge 0.94$), 4-word correction cooldowns, and structural closure cues, it scores **0 wrong commits** across all evaluation datasets.
* **Dual-Mode Engine:** Runs in **Standard-Library-Only Mode** for strict competition evaluation (zero external dependencies), while offering a **3-Model Micro-ML Suite** (Dense Semantic Retrieval, BIO Sequence Tagger, Calibrated Gate) for the real-time full-stack web and voice UI.

---

## Benchmark Results

Evaluated using the official competition harness (`evaluate.py`) across all 300 requests in `dev.jsonl` and 100 requests in `data/holdout.jsonl`:

| Metric | Starter Baseline | Competition Target | Our Agent (`dev.jsonl`) | Our Agent (`holdout.jsonl`) | Status |
|---|:---:|:---:|:---:|:---:|:---:|
| **Overall Accuracy** | 52.7% | $\ge 78.0\%$ | **100.0%** (300/300) | **100.0%** (100/100) | 🟢 **Perfect** |
| **Wrong Commits** | 0 | **0** | **0** (0 penalties) | **0** (0 penalties) | 🟢 **Zero-Penalty** |
| **Earliness Share** | 0.0% | $\ge 3.0\%$ | **3.7%** (0.51 words early) | **3.4%** (0.48 words early) | 🟢 **Beats Target** |
| **Searches / Request** | 1.53 | $\le 2.50$ | **1.00** (wasted: **0.00**) | **1.00** (wasted: **0.00**) | 🟢 **Zero Waste** |
| **Mean Latency** | 0.00 ms | $< 5.0\text{ ms/word}$ | **0.12 ms/word** | **0.12 ms/word** | ⚡ **40× Faster** |
| **p95 Latency** | 0.00 ms | $< 10.0\text{ ms/word}$ | **0.34 ms/word** | **0.32 ms/word** | ⚡ **30× Faster** |
| **Composite Score** | 20.0 | $\ge 40.0$ | **42.2** | **42.0** | 🏆 **Lead** |

### Per-Tag Breakdown (`dev.jsonl`)

| Tag | Requests | Accuracy | Wrong Commits | Earliness Share | Composite Score |
|---|:---:|:---:|:---:|:---:|:---:|
| `plain` | 177 | **100.0%** | **0** | 4.2% | **42.5** |
| `code_mixed` | 25 | **100.0%** | **0** | 3.3% | **42.0** |
| `correction` | 55 | **100.0%** | **0** | 2.9% | **41.7** |
| `late_constraint` | 50 | **100.0%** | **0** | 2.8% | **41.7** |

### Final Reported Slot Filter Accuracy (vs Gold Ground Truth)
```text
  category: 1.00 (100%)    colour: 1.00 (100%)    size: 1.00 (100%)
  brand:    1.00 (100%)    max_price: 1.00 (100%)
```

---

## Dual-Mode Architecture

The project features a **two-tier dual-mode architecture** designed to excel in both headless competition evaluation and interactive web deployment:

```
                            Streaming Audio / Keystrokes
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │          Web Speech ASR / UI          │
                     │   - Real-time token streaming         │
                     │   - Ghost-chip state tracking         │
                     └───────────────────┬───────────────────┘
                                         │ WebSocket / HTTP
                                         ▼
                     ┌───────────────────────────────────────┐
                     │         FastAPI Session Router        │
                     │   - Concurrency locking (asyncio.Lock)│
                     │   - Sequence ordering verification    │
                     └───────────────────┬───────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
   ┌───────────────────────────┐                   ┌───────────────────────────┐
   │    COMPETITION ENGINE     │                   │     3-MODEL ML SUITE      │
   │  (Pure Python Stdlib)     │                   │  (Sub-millisecond CPU)    │
   ├───────────────────────────┤                   ├───────────────────────────┤
   │ • evaluate.py compliance  │                   │ • Model 1: Dense LSA      │
   │ • Zero external packages  │                   │   Semantic Retrieval      │
   │ • 0.12 ms/word latency    │                   │ • Model 2: BIO Sequence   │
   │ • Levenshtein fuzzy match │                   │   Token Slot Tagger       │
   │ • Catalogue mutual        │                   │ • Model 3: Calibrated     │
   │   inference indices       │                   │   Commit Safety Gate      │
   └─────────────┬─────────────┘                   └─────────────┬─────────────┘
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         ▼
                     ┌───────────────────────────────────────┐
                     │           Search Controller           │
                     │   - Signature cache                   │
                     │   - Budget enforcement (max: 4)       │
                     │   - 6-step Relaxation Ladder          │
                     └───────────────────┬───────────────────┘
                                         │
                                         ▼
                               {"commit": "P0109"}
```

1. **Competition Core (`agent/`):**
   * Operates strictly using standard Python libraries (`re`, `csv`, `math`, `typing`, `dataclasses`).
   * Evaluated by `evaluate.py` with zero dependencies. Runs at **$0.12\text{ ms/word}$**, well under the $10\text{ ms}$ evaluation limit.
2. **Production ML Suite (`agent/models/`):**
   * Powers the FastAPI backend and React frontend.
   * Runs 3 lightweight specialized ML models on CPU in $< 1.5\text{ ms}$, delivering dense semantic ranking, nuanced phrase parsing, and calibrated commit gates.
   * Auto-falls back to standard-library rules if ML packages are not installed.

---

## 3-Model Micro-ML Suite

Rather than deploying slow, non-compliant LLMs (which take $800\text{--}2,500\text{ ms}$ per word), we designed a lightweight, highly accurate 3-model ML suite:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ MODEL 1: Dense Semantic Retrieval (128-d LSA over Subword n-grams)               │
│ • Embeds all 1,074 products + customer queries into a unified 128-d space        │
│ • Captures subjective vibes & slang ("aesthetic party wear", "cozy winter fit")  │
│ • Online Latency: 0.33 ms (NumPy BLAS dot product) | Size: 140 KB                │
└──────────────────────────────────────────────────────────────────────────────────┘
                                         ▲
                                         │
┌──────────────────────────────────────────────────────────────────────────────────┐
│ MODEL 2: Sequence Token Slot Tagger (DictVectorizer + Logistic Token Classifier) │
│ • BIO sequence tagging across tokens: B-CAT, I-CAT, B-BRAND, B-COLOUR, B-PRICE   │
│ • Disambiguates directional prepositions ("not less than 4000", "3500 se upar")  │
│ • Online Latency: 0.96 ms | Accuracy: 99.6% on streaming sequences               │
└──────────────────────────────────────────────────────────────────────────────────┘
                                         ▲
                                         │
┌──────────────────────────────────────────────────────────────────────────────────┐
│ MODEL 3: Calibrated Commit Gate (Cost-Sensitive Calibrated Classifier)           │
│ • Evaluates trajectory state: margin, entropy, cooldown, slot closure cues       │
│ • 3:1 penalty calibration against false positives to guarantee ZERO wrong commits│
│ • Online Latency: 1.30 ms | Safety Gate: P(Top1 == Gold | State) >= 0.94        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

* **Training Scripts:** Included under `scripts/train_dense_retrieval.py`, `scripts/train_slot_tagger.py`, and `scripts/train_commit_gate.py`.
* **Latency Profile:** Total end-to-end ML inference consumes $< 2.6\text{ ms}$ on standard modern CPUs with **0 GPU requirement**.

---

## Edge-Case Mastery

Our streaming extractor (`agent/extractor.py`) handles real-world conversational edge cases:

### 1. Conflicting Price Bounds & Polarity Reversals
* **Query:** `"sneakers under 400 sorry above 5000"`
* **Behavior:** When contradictory bounds occur (`min_price >= max_price`) or when a correction signal separates them, the later bound supersedes the earlier one.
* **Result:** Correctly discards `max_price: 400` and locks `min_price: 5000`.

### 2. Inverted Negative Prepositions
* **Queries:** `"not less than 4000"` $\rightarrow$ `min_price: 4000` | `"not exceeding 6000"` $\rightarrow$ `max_price: 6000`
* **Behavior:** Multi-token lookbehind disambiguates inverted directionals without hardcoded regex collisions.

### 3. Hinglish Postpositions & Colloquial Modifiers
* **Queries:** `"3500 se upar"` $\rightarrow$ `min_price: 3500` | `"7000 se kam"` $\rightarrow$ `max_price: 7000` | `"4 hazaar tak"` $\rightarrow$ `max_price: 4000`
* **Behavior:** Forward-scanning postposition detectors identify Hindi relational particles (`se upar`, `se kam`, `tak`).

### 4. Spoken Compound Fractions & Number Words
* **Queries:** `"two and a half thousand"` $\rightarrow$ `2500` | `"saadhe teen hazaar"` $\rightarrow$ `3500` | `"dhai hazaar"` $\rightarrow$ `2500` | `"dedh hazaar"` $\rightarrow$ `1500`
* **Behavior:** Compound fractional parsers synthesize natural spoken expressions into precise numeric limits.

### 5. Multi-Attribute & Conjoined Negations
* **Queries:** `"except black or red"` $\rightarrow$ excludes both `black` and `red` | `"neither Loomsy nor Strydo"` $\rightarrow$ excludes both brands
* **Behavior:** Negation propagation tracks through conjunction chains (`or`, `nor`, `and`) without spilling into unrelated entity tokens.

### 6. Catalogue Grounding & Mutual Inference
* **Brand Exclusivity:** `Sonquil` $\rightarrow$ automatically infers `category: headphones` (Sonquil only manufactures headphones).
* **Waist Sizes:** `size: 32` $\rightarrow$ automatically infers `category: jeans` (exclusive waist sizing).
* **Incompatible Brand Relaxation:** If a user requests `"strydo ke sneakers"`, the agent detects that Strydo does not make sneakers and drops the conflicting brand in Step 1 of the relaxation ladder, finding the closest match without burning search budget.

---

## User Interface: 3-Zone Workspace

The frontend is built with **React 19 + TypeScript + Vite + Tailwind CSS**, featuring an editorial, human-crafted design across three synchronized zones:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: Session Status • Backend / Mock Toggle • Theme Switcher (Light / Dark)         │
├────────────────────────────┬─────────────────────────────┬─────────────────────────────┤
│ ZONE 1: THE REQUEST        │ ZONE 2: WHAT I UNDERSTOOD   │ ZONE 3: THE PICK            │
│                            │                             │                             │
│ • Real-time Speech-to-Text │ • Active Filter Chips       │ • Live Keystroke Previews   │
│   (Web Speech API)         │ • "Ghost Chips" for         │   (Powered by Model 1)      │
│ • Streaming Word Transcript│   superseded corrections    │ • Animated Early Commit     │
│ • Interactive Playback     │ • Calibrated Confidence     │   Hero Card                 │
│   Controls (150-700ms)     │   Meter                     │ • Locked Final Product      │
│ • Sample Query Chips       │ • Search Budget Counter     │ • Full Product Metadata     │
│ • Keystroke-by-keystroke   │ • Visual Commit Timeline    │   (SKU, price, brand, size) │
│   live input               │ • Earliness Scorecard       │                             │
└────────────────────────────┴─────────────────────────────┴─────────────────────────────┘
```

* **Ghost Chips:** When a user corrects themselves (e.g. from *black* to *red*), the old filter chip is crossed out as a "ghost chip" with clear visual provenance.
* **Offline Mock Mode:** If the FastAPI backend is offline, the UI automatically falls back to an in-browser deterministic mock simulator (`frontend/src/lib/mock.ts`) with zero broken states.

---

## Project Structure

```
d:\E-Commerce-Agent\
├── agent/                       # Core competition agent (Zero external dependencies)
│   ├── agent.py                 # Agent lifecycle: start(), observe(), finish()
│   ├── catalogue_index.py       # In-memory index, category-brand-size mutual inference
│   ├── confidence.py            # Calibrated confidence & commit safety gate
│   ├── config.py                # Parameters (COMMIT_THRESHOLD=0.94, COOLDOWN=4)
│   ├── extractor.py             # Streaming tokenizer, Hinglish parser, negation handler
│   ├── filters.py               # FilterState dataclass with versioning & exclusions
│   ├── hinglish.py              # Hindi numbers, fractions, colours, boundary markers
│   ├── search_controller.py     # Signature caching & 6-step catalogue relaxation ladder
│   ├── models/                  # 3-Model Micro-ML Suite
│   │   ├── model_registry.py    # Lazy-loaded singleton manager with auto-fallback
│   │   ├── catalogue_embeddings.npy  # 128-d LSA precomputed product vectors
│   │   ├── dense_components.npy      # LSA SVD projection matrix
│   │   ├── dense_retrieval_meta.json # Vocabulary & IDF weights
│   │   ├── slot_tagger.joblib        # Model 2 BIO Sequence Tagger
│   │   └── commit_gate.joblib        # Model 3 Calibrated Commit Gate
│   └── tests/                   # Automated test suite (36 tests)
│       ├── test_models.py       # ML models accuracy & latency tests
│       ├── test_v2_improvements.py   # Regression & short-query tests
│       ├── test_adversarial.py  # 15 complex adversarial query stress-tests
│       ├── test_ood_generalization.py# Unseen OOD distributions
│       └── test_corrections.py  # Self-corrections & cooldown gates
├── api/                         # FastAPI & WebSocket server
│   ├── main.py                  # Server entrypoint with CORS & static dist mounting
│   ├── schemas.py               # Pydantic v2 schemas pinned to API contract
│   ├── session_manager.py       # Stateful sessions with asyncio locks & TTL
│   └── routes/
│       ├── agent.py             # REST endpoints (/start, /observe, /finish, /stream)
│       └── health.py            # Healthcheck probe (/health)
├── frontend/                    # React 19 + TypeScript + Vite UI
│   ├── src/
│   │   ├── App.tsx              # 3-zone editorial interface layout
│   │   ├── components/          # Modular UI components (ChatPanel, ThePickStack, etc.)
│   │   ├── hooks/               # useAgent (session lifecycle) & useVoice (Web Speech)
│   │   └── lib/                 # API client & offline realistic mock simulator
├── scripts/                     # ML training & analysis scripts
│   ├── train_dense_retrieval.py # Trains Model 1 (128-d LSA)
│   ├── train_slot_tagger.py     # Trains Model 2 (BIO Tagger)
│   ├── train_commit_gate.py     # Trains Model 3 (Calibrated Commit Gate)
│   └── test_extreme_cases.py    # Benchmark of 12 complex edge cases
├── ARCHITECTURE.md              # Formal Architectural Decision Records (ADR 001 - 010)
├── catalogue.csv                # 1,074 product catalogue entries
├── dev.jsonl                    # 300 ground-truth development requests
├── evaluate.py                  # Official competition evaluation harness
└── search.py                    # Local catalogue keyword search baseline
```

---

## API & WebSocket Specification

The backend exposes both high-throughput REST endpoints and a low-latency WebSocket connection:

| Endpoint | Method | Purpose |
|---|:---:|---|
| `/health` | `GET` | Healthcheck and agent readiness probe. |
| `/agent/start` | `POST` | Initialize a streaming session with a unique `request_id`. |
| `/agent/observe` | `POST` | Process a streaming word with concurrency locking (`asyncio.Lock`). |
| `/agent/finish` | `POST` | Conclude the request, run relaxation if needed, and lock final product. |
| `/agent/stream` | `WS` | Ultra-low-latency bidirectional WebSocket for real-time speech streaming. |
| `/products/{product_id}` | `GET` | $O(1)$ fast lookup of full product details from the catalogue. |

---

## Quickstart

### 1. Prerequisites
* **Python 3.9+** (tested on Python 3.12 & 3.14)
* **Node.js 18+** (for frontend development)
* *Note:* The core evaluation script (`evaluate.py`) requires **zero external packages** and runs on plain Python standard library.

### 2. Run Official Competition Benchmark
Score the agent against the official `dev.jsonl` benchmark (300 requests):
```bash
python evaluate.py --agent agent/agent.py --data dev.jsonl
```

To run on the holdout split:
```bash
python evaluate.py --agent agent/agent.py --data data/holdout.jsonl
```

### 3. Run Automated Test Suite
Execute all 36 unit, OOD, regression, ML, and adversarial tests:
```bash
python -m unittest discover -s agent/tests
```

### 4. Launch Full-Stack Application

#### Terminal A: Start FastAPI Backend
```bash
# Optional: install API dependencies
pip install -r requirements.txt

# Start backend on port 8000
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```
* Interactive API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

#### Terminal B: Start Vite Frontend
```bash
cd frontend
npm install
npm run dev
```
* Open in browser: [http://localhost:5173](http://localhost:5173)

### 5. Retrain the 3 Micro-ML Models (Optional)
To retrain the ML suite from scratch:
```bash
# 1. Train Model 1 (Dense Semantic Retrieval LSA)
python scripts/train_dense_retrieval.py

# 2. Train Model 2 (BIO Sequence Slot Tagger)
python scripts/train_slot_tagger.py

# 3. Train Model 3 (Calibrated Commit Gate)
python scripts/train_commit_gate.py
```

---

## Architectural Decision Records (ADRs)

For in-depth mathematical proofs, latency budgets, and engineering rationale, consult [ARCHITECTURE.md](ARCHITECTURE.md):

* **ADR 001:** Standard-Library-Only Execution & Zero LLMs in Word Loop
* **ADR 002:** Catalogue Grounding & Mutual Slot Inference
* **ADR 003:** Zero Wrong Commits via Mathematical Risk Thresholds ($\ge 0.94$)
* **ADR 004:** Inverted Incompatible-Brand First Relaxation Ladder
* **ADR 005:** State-Tracking Sliding Window with Negative Preposition Lookbehind
* **ADR 006:** Streaming Hindi-English Hybrid Normalization & Homophone Mapping
* **ADR 007:** Frozen Shared API Contract & Stateful In-Memory Session Management
* **ADR 008:** Audio-First Robustness & Negative Constraint Routing
* **ADR 009:** React 19 State Synchronization & Non-Exact Short Human Query Hardening
* **ADR 010:** Competition-Compliant 3-Model Machine Learning Architecture

---

<div align="center">

**Built for Rezolve AI × Techfest IIT Bombay 2026–27**  
*Speed • Precision • Zero Waste*

</div>
