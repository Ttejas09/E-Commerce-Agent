"""Train Model 3: Calibrated Semantic Match Classifier & Commit Gating Model.

Simulates word-by-word streaming trajectories over dev.jsonl:
Extracts multi-modal features at each word step (dense semantic similarity,
slot tagger activations, candidate count, margin, cooldown, closure).
Trains a cost-sensitive calibrated classifier to predict P(Top1 == Gold Target | State).

Saves to:
- agent/models/commit_gate.joblib
- agent/models/commit_gate_weights.json
"""

import csv
import json
import math
import sys
from pathlib import Path
import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV

REPO_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = REPO_ROOT / "agent" / "models"

sys.path.insert(0, str(REPO_ROOT))
from search import search, load_catalogue
from agent.extractor import IncrementalExtractor

DEV_PATH = REPO_ROOT / "dev.jsonl"


def extract_step_features(dense_sim1, dense_sim2, candidate_count, slots, in_cooldown, has_closure, word_idx):
    has_cat = float(slots.get("category") is not None)
    has_brand = float(slots.get("brand") is not None)
    has_col = float(slots.get("colour") is not None)
    has_sz = float(slots.get("size") is not None)
    has_price = float(slots.get("max_price") is not None or slots.get("min_price") is not None)
    num_slots = has_cat + has_brand + has_col + has_sz + has_price
    
    margin = max(0.0, dense_sim1 - dense_sim2)
    is_single = 1.0 if candidate_count == 1 else 0.0
    cand_log = math.log(candidate_count + 1)
    
    return [
        dense_sim1,                 # Top-1 semantic cosine similarity
        margin,                     # Margin to Top-2
        is_single,                  # Candidate count == 1
        cand_log,                   # Candidate count log
        has_cat,                    # Category present
        has_brand,                  # Brand present
        has_col,                    # Colour present
        has_sz,                     # Size present
        has_price,                  # Price present
        num_slots,                  # Total slots
        1.0 if in_cooldown else 0.0,# Cooldown active
        1.0 if has_closure else 0.0,# Structural closure
        min(word_idx / 10.0, 1.0),  # Word stream progress
    ]


FEATURE_NAMES = [
    "dense_sim1",
    "margin",
    "is_single",
    "cand_log",
    "has_cat",
    "has_brand",
    "has_col",
    "has_sz",
    "has_price",
    "num_slots",
    "in_cooldown",
    "has_closure",
    "word_progress"
]


def main():
    print("Loading Model 1 (Dense Retrieval) and Catalogue...")
    catalogue = load_catalogue()
    cat_emb_path = MODELS_DIR / "catalogue_embeddings.npy"
    if not cat_emb_path.exists():
        print("Error: Run train_dense_retrieval.py first!")
        return
        
    cat_embeddings = np.load(cat_emb_path)
    
    # Load dense retrieval vectorizer & SVD
    with open(MODELS_DIR / "dense_retrieval_meta.json", "r", encoding="utf-8") as f:
        meta = json.load(f)
    vocab = meta["vocabulary"]
    idf = np.array(meta["idf"], dtype=np.float32)
    components = np.array(meta["components"], dtype=np.float32)
    
    def encode_text(text):
        tokens = text.lower().split()
        tf = {}
        for t in tokens:
            if t in vocab:
                idx = vocab[t]
                tf[idx] = tf.get(idx, 0) + 1
        if not tf:
            return np.zeros((128,), dtype=np.float32)
        # Sublinear TF-IDF
        vec = np.zeros((len(idf),), dtype=np.float32)
        for idx, count in tf.items():
            vec[idx] = (1.0 + math.log(count)) * idf[idx]
        # Project through components (128 x V)
        dense = np.dot(components, vec)
        norm = np.linalg.norm(dense)
        return (dense / norm).astype(np.float32) if norm > 0 else dense

    print("Simulating streaming trajectories over dev.jsonl...")
    with open(DEV_PATH, "r", encoding="utf-8") as f:
        requests = [json.loads(line) for line in f if line.strip()]

    X_train = []
    y_train = []

    for req in requests:
        words = req["words"]
        target = req["target"]
        
        extractor = IncrementalExtractor()
        
        for t, word in enumerate(words, 1):
            state = extractor.process_word(word, t)
            
            # Run fast candidate lookup
            filters = state.get_search_filters()
            hits = search(" ".join(extractor.raw_words), filters=filters, k=5)
            
            cand_count = len(hits)
            if cand_count == 0:
                continue
                
            # Compute semantic similarities
            q_emb = encode_text(" ".join(extractor.raw_words))
            if cand_count >= 1:
                idx1 = next((i for i, p in enumerate(catalogue) if p["product_id"] == hits[0]["product_id"]), 0)
                sim1 = float(np.dot(cat_embeddings[idx1], q_emb))
            else:
                sim1 = 0.0
                
            if cand_count >= 2:
                idx2 = next((i for i, p in enumerate(catalogue) if p["product_id"] == hits[1]["product_id"]), 0)
                sim2 = float(np.dot(cat_embeddings[idx2], q_emb))
            else:
                sim2 = 0.0
                
            has_closure = extractor.has_closure_cue()
            in_cooldown = extractor.is_in_cooldown(t)
            
            slots = {
                "category": state.category,
                "brand": state.brand,
                "colour": state.colour,
                "size": state.size,
                "max_price": state.max_price,
                "min_price": state.min_price,
            }
            
            feats = extract_step_features(
                dense_sim1=sim1,
                dense_sim2=sim2,
                candidate_count=cand_count,
                slots=slots,
                in_cooldown=in_cooldown,
                has_closure=has_closure,
                word_idx=t
            )
            
            # Label: 1 if hits[0] is the true gold target, 0 otherwise
            label = 1 if hits[0]["product_id"] == target else 0
            
            X_train.append(feats)
            y_train.append(label)

    X_train = np.array(X_train, dtype=np.float32)
    y_train = np.array(y_train, dtype=np.int32)
    print(f"Extracted {len(y_train)} trajectory step features (Positives: {np.sum(y_train)}, Negatives: {len(y_train) - np.sum(y_train)})")

    # Train Model 3: Cost-Sensitive Calibrated Classifier
    # Negative weight penalty to prevent wrong commits (-1.0 score hit)
    class_weight = {0: 3.0, 1: 1.0}
    print(f"Fitting Calibrated Commit Gate Classifier with penalty {class_weight}...")
    base_clf = LogisticRegression(C=1.0, class_weight=class_weight, max_iter=500)
    calibrated = CalibratedClassifierCV(estimator=base_clf, method="sigmoid", cv=5)
    calibrated.fit(X_train, y_train)

    train_probs = calibrated.predict_proba(X_train)[:, 1]
    
    # Analyze accuracy at various confidence thresholds
    print("\n--- Model 3 Confidence Threshold Calibration ---")
    print(f"{'Threshold':10} {'Commits':10} {'Accuracy':10} {'Wrong Commits':15}")
    for thresh in [0.70, 0.80, 0.85, 0.90, 0.92, 0.94, 0.96]:
        mask = train_probs >= thresh
        commits = np.sum(mask)
        if commits > 0:
            acc = np.mean(y_train[mask])
            wrongs = np.sum(y_train[mask] == 0)
            print(f"{thresh:10.2f} {commits:10} {acc*100:9.1f}% {wrongs:15}")

    # Save Model 3
    model_path = MODELS_DIR / "commit_gate.joblib"
    joblib.dump(calibrated, model_path, compress=3)
    print(f"\nSaved calibrated commit gate model: {model_path}")


if __name__ == "__main__":
    main()
