"""Train Model 2: Sequence Token / Slot Tagger
Predicts BIO tags for streaming tokens:
- B-CAT, I-CAT (Category)
- B-BRAND, I-BRAND (Brand)
- B-COLOUR, I-COLOUR (Colour)
- B-SIZE (Size)
- B-MIN_PRICE (Lower price bound)
- B-MAX_PRICE (Upper price bound)
- O (Outside)

Uses scikit-learn DictVectorizer + LogisticRegression for microsecond CPU inference (<0.3ms).
Saves model to:
- agent/models/slot_tagger.joblib
- agent/models/slot_tagger_meta.json
"""

import csv
import json
import re
from pathlib import Path
import joblib
import numpy as np
from sklearn.feature_extraction import DictVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report

REPO_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = REPO_ROOT / "agent" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

CATALOGUE_PATH = REPO_ROOT / "catalogue.csv"
DEV_PATH = REPO_ROOT / "dev.jsonl"


def load_catalogue():
    with open(CATALOGUE_PATH, "r", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def extract_token_features(words, i):
    w = words[i].lower()
    clean_w = re.sub(r"[^\w]", "", w)
    is_num = clean_w.isdigit()
    
    feats = {
        "bias": 1.0,
        "word": w,
        "clean_word": clean_w,
        "is_digit": float(is_num),
        "len": len(w),
        "prefix_2": w[:2] if len(w) >= 2 else w,
        "prefix_3": w[:3] if len(w) >= 3 else w,
        "suffix_2": w[-2:] if len(w) >= 2 else w,
        "suffix_3": w[-3:] if len(w) >= 3 else w,
    }
    
    # Left context (w_{i-1})
    if i > 0:
        prev_w = words[i-1].lower()
        feats["prev_word"] = prev_w
        feats["prev_is_digit"] = float(re.sub(r"[^\w]", "", prev_w).isdigit())
        feats["bigram_prev"] = f"{prev_w}_{w}"
    else:
        feats["BOS"] = 1.0  # Beginning of sentence
        
    # Left context 2 (w_{i-2})
    if i > 1:
        prev2_w = words[i-2].lower()
        feats["prev2_word"] = prev2_w
        feats["trigram_prev"] = f"{prev2_w}_{words[i-1].lower()}_{w}"

    # Right context (w_{i+1})
    if i < len(words) - 1:
        next_w = words[i+1].lower()
        feats["next_word"] = next_w
        feats["next_is_digit"] = float(re.sub(r"[^\w]", "", next_w).isdigit())
        feats["bigram_next"] = f"{w}_{next_w}"
    else:
        feats["EOS"] = 1.0  # End of sentence

    # Right context 2 (w_{i+2})
    if i < len(words) - 2:
        next2_w = words[i+2].lower()
        feats["next2_word"] = next2_w
        feats["trigram_next"] = f"{w}_{words[i+1].lower()}_{next2_w}"
        
    return feats


def build_training_examples():
    examples = []
    
    # 1. Dev.jsonl gold annotated examples
    if DEV_PATH.exists():
        with open(DEV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                req = json.loads(line)
                words = req["words"]
                gold = req.get("filters", {})
                
                # Tag words
                tags = ["O"] * len(words)
                text_lower = [w.lower() for w in words]
                
                # Tag category
                cat = (gold.get("category") or "").lower()
                if cat:
                    cat_tokens = cat.split()
                    for idx in range(len(words) - len(cat_tokens) + 1):
                        if [re.sub(r"[^\w]", "", text_lower[idx+j]) for j in range(len(cat_tokens))] == [re.sub(r"[^\w]", "", ct) for ct in cat_tokens]:
                            tags[idx] = "B-CAT"
                            for j in range(1, len(cat_tokens)):
                                tags[idx+j] = "I-CAT"
                                
                # Tag brand
                brand = (gold.get("brand") or "").lower()
                if brand:
                    brand_tokens = brand.split()
                    for idx in range(len(words) - len(brand_tokens) + 1):
                        if [re.sub(r"[^\w]", "", text_lower[idx+j]) for j in range(len(brand_tokens))] == [re.sub(r"[^\w]", "", bt) for bt in brand_tokens]:
                            tags[idx] = "B-BRAND"
                            for j in range(1, len(brand_tokens)):
                                tags[idx+j] = "I-BRAND"

                # Tag colour
                colour = (gold.get("colour") or "").lower()
                if colour:
                    colour_tokens = colour.split()
                    for idx in range(len(words) - len(colour_tokens) + 1):
                        if [re.sub(r"[^\w]", "", text_lower[idx+j]) for j in range(len(colour_tokens))] == [re.sub(r"[^\w]", "", c) for c in colour_tokens]:
                            tags[idx] = "B-COLOUR"
                            for j in range(1, len(colour_tokens)):
                                tags[idx+j] = "I-COLOUR"

                # Tag size
                size = str(gold.get("size") or "").lower()
                if size:
                    for idx, w in enumerate(text_lower):
                        clean = re.sub(r"[^\w]", "", w)
                        if clean == size:
                            tags[idx] = "B-SIZE"

                # Tag price bounds
                max_price = gold.get("max_price")
                min_price = gold.get("min_price")
                for idx, w in enumerate(text_lower):
                    clean = re.sub(r"[^\w]", "", w)
                    if clean.isdigit():
                        val = int(clean)
                        if max_price and val == max_price:
                            tags[idx] = "B-MAX_PRICE"
                        elif min_price and val == min_price:
                            tags[idx] = "B-MIN_PRICE"
                            
                examples.append((words, tags))
                
    # 2. Synthetic variations for robustness on directional syntax and Hinglish
    categories = ["sneakers", "running shoes", "formal shoes", "jacket", "bomber jacket", "t-shirt", "tshirt", "shirt", "jeans", "watch", "smartwatch", "headphones"]
    brands = ["kudova", "strydo", "urbanyx", "sonquil", "tikkra", "northweft", "loomsy"]
    colours = ["black", "white", "navy", "green", "red", "blue", "beige", "grey"]
    sizes = ["7", "8", "9", "10", "11", "s", "m", "l", "xl", "30", "32", "34"]
    
    # Synthetic templates - strongly weighted to learn directional prepositions
    min_templates = [
        ("above {val}", ["O", "B-MIN_PRICE"]),
        ("over {val}", ["O", "B-MIN_PRICE"]),
        ("more than {val}", ["O", "O", "B-MIN_PRICE"]),
        ("greater than {val}", ["O", "O", "B-MIN_PRICE"]),
        ("at least {val}", ["O", "O", "B-MIN_PRICE"]),
        ("starting from {val}", ["O", "O", "B-MIN_PRICE"]),
        ("min {val}", ["O", "B-MIN_PRICE"]),
        ("minimum {val}", ["O", "B-MIN_PRICE"]),
        ("{val} se upar", ["B-MIN_PRICE", "O", "O"]),
        ("{val} se zyada", ["B-MIN_PRICE", "O", "O"]),
        ("not under {val}", ["O", "O", "B-MIN_PRICE"]),
        ("not less than {val}", ["O", "O", "O", "B-MIN_PRICE"]),
    ]
    
    max_templates = [
        ("under {val}", ["O", "B-MAX_PRICE"]),
        ("below {val}", ["O", "B-MAX_PRICE"]),
        ("less than {val}", ["O", "O", "B-MAX_PRICE"]),
        ("at most {val}", ["O", "O", "B-MAX_PRICE"]),
        ("within {val}", ["O", "B-MAX_PRICE"]),
        ("max {val}", ["O", "B-MAX_PRICE"]),
        ("budget {val}", ["O", "B-MAX_PRICE"]),
        ("upto {val}", ["O", "B-MAX_PRICE"]),
        ("{val} se kam", ["B-MAX_PRICE", "O", "O"]),
        ("not more than {val}", ["O", "O", "O", "B-MAX_PRICE"]),
        ("not above {val}", ["O", "O", "B-MAX_PRICE"]),
        ("no more than {val}", ["O", "O", "O", "B-MAX_PRICE"]),
    ]
    
    price_values = [1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7500, 10000]
    
    import random
    rng = random.Random(42)
    
    # Generate 1500 synthetic examples with equal min and max distribution
    for _ in range(1500):
        b = rng.choice(brands)
        c = rng.choice(categories)
        col = rng.choice(colours)
        sz = rng.choice(sizes)
        
        c_toks = c.split()
        b_toks = b.split()
        
        words = [b] + [col] + c_toks + ["size", sz]
        tags = ["B-BRAND"] + ["B-COLOUR"] + (["B-CAT", "I-CAT"] if len(c_toks) == 2 else ["B-CAT"]) + ["O", "B-SIZE"]
        
        p_mode = rng.choice(["min", "max", "range"])
        if p_mode == "min":
            tmpl, tmpl_tags = rng.choice(min_templates)
            val = rng.choice(price_values)
            tmpl_words = tmpl.format(val=val).split()
            words.extend(tmpl_words)
            tags.extend(tmpl_tags)
        elif p_mode == "max":
            tmpl, tmpl_tags = rng.choice(max_templates)
            val = rng.choice(price_values)
            tmpl_words = tmpl.format(val=val).split()
            words.extend(tmpl_words)
            tags.extend(tmpl_tags)
        elif p_mode == "range":
            v1, v2 = sorted(rng.sample(price_values, 2))
            words.extend(["between", str(v1), "and", str(v2)])
            tags.extend(["O", "B-MIN_PRICE", "O", "B-MAX_PRICE"])
            
        examples.append((words, tags))
        
    return examples


def main():
    print("Extracting training examples...")
    examples = build_training_examples()
    print(f"Total training sequences: {len(examples)}")
    
    X_dict = []
    y = []
    
    for words, tags in examples:
        for i in range(len(words)):
            feats = extract_token_features(words, i)
            X_dict.append(feats)
            y.append(tags[i])
            
    print(f"Total token instances: {len(y)}")
    
    # Vectorize
    print("Vectorizing token features...")
    vectorizer = DictVectorizer(sparse=True)
    X = vectorizer.fit_transform(X_dict)
    print(f"Feature matrix shape: {X.shape}")
    
    # Train Logistic Regression
    print("Training Logistic Regression Token Classifier...")
    clf = LogisticRegression(C=2.0, max_iter=500, solver="lbfgs")
    clf.fit(X, y)
    
    train_acc = clf.score(X, y)
    print(f"Training accuracy: {train_acc:.4f}")
    
    # Save joblib model
    model_bundle = {
        "vectorizer": vectorizer,
        "classifier": clf,
        "classes": clf.classes_.tolist()
    }
    model_path = MODELS_DIR / "slot_tagger.joblib"
    joblib.dump(model_bundle, model_path, compress=3)
    print(f"Saved slot tagger bundle to {model_path} ({model_path.stat().st_size / 1024:.1f} KB)")
    
    # Test sample phrases
    test_phrases = [
        "black sneakers above 5000",
        "kudova running shoes under 3000",
        "white jacket size m between 2000 and 4000",
        "red t-shirt not more than 1500",
        "sonquil headphones 3000 se upar"
    ]
    
    import time
    print("\n--- Model 2 Slot Tagger Inference Test ---")
    for phrase in test_phrases:
        words = phrase.split()
        t0 = time.perf_counter()
        feats = [extract_token_features(words, i) for i in range(len(words))]
        feat_vecs = vectorizer.transform(feats)
        preds = clf.predict(feat_vecs)
        probs = np.max(clf.predict_proba(feat_vecs), axis=1)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        
        tagged = [f"{w}[{pred}:{p:.2f}]" for w, pred, p in zip(words, preds, probs)]
        print(f"'{phrase}' ({elapsed_ms:.2f} ms):")
        print("   " + " ".join(tagged))


if __name__ == "__main__":
    main()
