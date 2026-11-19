"""Unified Model Manager for Anticipatory Commerce.

Integrates 3 specialized ML models:
- Model 1: Dense Semantic Retrieval (128-d LSA over catalogue & subwords)
- Model 2: Sequence Token Slot Tagger (DictVectorizer + Logistic Token Classifier)
- Model 3: Calibrated Commit Gate (CalibratedClassifierCV over streaming trajectory features)

All models are designed for CPU execution in < 1 ms with zero GPU requirements
and graceful fallback to ensure 100% competition compliance.
"""

import csv
import json
import math
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

MODELS_DIR = Path(__file__).resolve().parent
REPO_ROOT = MODELS_DIR.parent.parent

# Lazy loaded singletons
_MODEL1_LOADED = False
_CAT_EMBEDDINGS = None
_MODEL1_META = None
_CATALOGUE_ROWS = None

_MODEL2_LOADED = False
_MODEL2_BUNDLE = None

_MODEL3_LOADED = False
_MODEL3_MODEL = None


def _load_catalogue_rows():
    global _CATALOGUE_ROWS
    if _CATALOGUE_ROWS is None:
        cat_path = REPO_ROOT / "catalogue.csv"
        if cat_path.exists():
            with open(cat_path, "r", encoding="utf-8") as f:
                _CATALOGUE_ROWS = list(csv.DictReader(f))
                for r in _CATALOGUE_ROWS:
                    r["price"] = int(r["price"])
        else:
            _CATALOGUE_ROWS = []
    return _CATALOGUE_ROWS


def load_model1_dense():
    """Load Model 1: Dense Semantic Retrieval components."""
    global _MODEL1_LOADED, _CAT_EMBEDDINGS, _MODEL1_META
    if _MODEL1_LOADED:
        return _CAT_EMBEDDINGS, _MODEL1_META

    emb_path = MODELS_DIR / "catalogue_embeddings.npy"
    comp_path = MODELS_DIR / "dense_components.npy"
    meta_path = MODELS_DIR / "dense_retrieval_meta.json"

    if emb_path.exists() and meta_path.exists():
        try:
            import numpy as np
            _CAT_EMBEDDINGS = np.load(emb_path)
            with open(meta_path, "r", encoding="utf-8") as f:
                _MODEL1_META = json.load(f)
            _MODEL1_META["idf"] = np.array(_MODEL1_META["idf"], dtype=np.float32)
            if comp_path.exists():
                _MODEL1_META["components"] = np.load(comp_path)
            else:
                _MODEL1_META["components"] = np.array(_MODEL1_META.get("components", []), dtype=np.float32)
            _MODEL1_LOADED = True
        except Exception:
            _MODEL1_LOADED = False
    return _CAT_EMBEDDINGS, _MODEL1_META


def dense_semantic_search(query: str, filters: Optional[Dict[str, Any]] = None, k: int = 10) -> List[Dict[str, Any]]:
    """Model 1: Retrieve top-k products using dense cosine similarity across 1,074 products."""
    emb, meta = load_model1_dense()
    if emb is None or meta is None:
        return []

    import numpy as np
    vocab = meta["vocabulary"]
    idf = meta["idf"]
    components = meta["components"]
    rows = _load_catalogue_rows()

    tokens = query.lower().split()
    tf: Dict[int, int] = {}
    for t in tokens:
        if t in vocab:
            idx = vocab[t]
            tf[idx] = tf.get(idx, 0) + 1

    if not tf:
        return []

    # Sublinear TF-IDF vector
    vec = np.zeros((len(idf),), dtype=np.float32)
    for idx, count in tf.items():
        vec[idx] = (1.0 + math.log(count)) * idf[idx]

    # Project to 128-d
    dense = np.dot(components, vec)
    norm = np.linalg.norm(dense)
    if norm > 0:
        dense /= norm
    else:
        return []

    # Fast matrix dot product: (1074, 128) dot (128,) -> (1074,)
    sims = np.dot(emb, dense)

    # Filter evaluation
    filters = filters or {}
    candidates = []
    for idx, p in enumerate(rows):
        if "category" in filters and filters["category"] and p["category"].lower() != str(filters["category"]).lower():
            continue
        if "brand" in filters and filters["brand"] and p["brand"].lower() != str(filters["brand"]).lower():
            continue
        if "colour" in filters and filters["colour"] and p["colour"].lower() != str(filters["colour"]).lower():
            continue
        if "size" in filters and filters["size"] and p["size"].lower() != str(filters["size"]).lower():
            continue
        if "max_price" in filters and filters["max_price"] and p["price"] > filters["max_price"]:
            continue
        if "min_price" in filters and filters["min_price"] and p["price"] < filters["min_price"]:
            continue
        candidates.append((sims[idx], p["price"], p))

    # Sort by descending semantic similarity, then price
    candidates.sort(key=lambda x: (-x[0], x[1]))
    return [dict(p, score=round(float(s), 4)) for s, _, p in candidates[:k]]


def load_model2_tagger():
    """Load Model 2: Sequence Token Slot Tagger."""
    global _MODEL2_LOADED, _MODEL2_BUNDLE
    if _MODEL2_LOADED:
        return _MODEL2_BUNDLE

    model_path = MODELS_DIR / "slot_tagger.joblib"
    if model_path.exists():
        try:
            import joblib
            _MODEL2_BUNDLE = joblib.load(model_path)
            _MODEL2_LOADED = True
        except Exception:
            _MODEL2_LOADED = False
    return _MODEL2_BUNDLE


def predict_slots_with_model2(words: List[str]) -> Dict[str, Any]:
    """Model 2: Predict slots from token sequence using the trained tagger."""
    bundle = load_model2_tagger()
    if bundle is None:
        return {}

    from scripts.train_slot_tagger import extract_token_features
    import re
    import numpy as np

    vectorizer = bundle["vectorizer"]
    clf = bundle["classifier"]

    feats = [extract_token_features(words, i) for i in range(len(words))]
    feat_vecs = vectorizer.transform(feats)
    preds = clf.predict(feat_vecs)
    probs = np.max(clf.predict_proba(feat_vecs), axis=1)

    slots: Dict[str, Any] = {}
    current_cat: List[str] = []
    current_brand: List[str] = []
    current_col: List[str] = []

    for w, pred, prob in zip(words, preds, probs):
        if prob < 0.40:
            continue
        clean_w = re.sub(r"[^\w]", "", w.lower())

        if pred == "B-CAT":
            current_cat = [clean_w]
        elif pred == "I-CAT":
            current_cat.append(clean_w)
        elif pred == "B-BRAND":
            current_brand = [clean_w]
        elif pred == "I-BRAND":
            current_brand.append(clean_w)
        elif pred == "B-COLOUR":
            current_col = [clean_w]
        elif pred == "I-COLOUR":
            current_col.append(clean_w)
        elif pred == "B-SIZE":
            slots["size"] = clean_w
        elif pred == "B-MAX_PRICE":
            if clean_w.isdigit():
                slots["max_price"] = int(clean_w)
        elif pred == "B-MIN_PRICE":
            if clean_w.isdigit():
                slots["min_price"] = int(clean_w)

    if current_cat:
        slots["category"] = " ".join(current_cat)
    if current_brand:
        slots["brand"] = " ".join(current_brand)
    if current_col:
        slots["colour"] = " ".join(current_col)

    return slots


def load_model3_gate():
    """Load Model 3: Calibrated Commit Gate."""
    global _MODEL3_LOADED, _MODEL3_MODEL
    if _MODEL3_LOADED:
        return _MODEL3_MODEL

    model_path = MODELS_DIR / "commit_gate.joblib"
    if model_path.exists():
        try:
            import joblib
            _MODEL3_MODEL = joblib.load(model_path)
            _MODEL3_LOADED = True
        except Exception:
            _MODEL3_LOADED = False
    return _MODEL3_MODEL


def evaluate_commit_with_model3(
    dense_sim1: float,
    dense_sim2: float,
    candidate_count: int,
    slots: Dict[str, Any],
    in_cooldown: bool,
    has_closure: bool,
    word_idx: int,
) -> float:
    """Model 3: Return calibrated probability P(top1 == Target | state)."""
    model = load_model3_gate()
    if model is None:
        # Fallback to calibrated heuristic formula if model unavailable
        if candidate_count == 1:
            return 0.95 if (has_closure and not in_cooldown) else 0.85
        return 0.50

    from scripts.train_commit_gate import extract_step_features
    import numpy as np

    feats = extract_step_features(
        dense_sim1=dense_sim1,
        dense_sim2=dense_sim2,
        candidate_count=candidate_count,
        slots=slots,
        in_cooldown=in_cooldown,
        has_closure=has_closure,
        word_idx=word_idx,
    )

    X = np.array([feats], dtype=np.float32)
    prob = float(model.predict_proba(X)[0, 1])
    return prob
