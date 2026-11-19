"""Train Model 1: Dense Semantic Retrieval (128-d L2-normalized latent semantic space)
over catalogue.csv and dev/holdout queries.

Exports:
- agent/models/catalogue_embeddings.npy (1074 x 128 float32 matrix)
- agent/models/dense_retrieval_vocab.json (IDF weights, subword vocab, SVD projection)
"""

import csv
import json
from pathlib import Path
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.decomposition import TruncatedSVD

REPO_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = REPO_ROOT / "agent" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

CATALOGUE_PATH = REPO_ROOT / "catalogue.csv"
DEV_PATH = REPO_ROOT / "dev.jsonl"


def load_catalogue():
    with open(CATALOGUE_PATH, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    return rows


def build_product_text(p):
    # Combine title, brand, category, colour, size, and description
    return f"{p['title']} {p['brand']} {p['category']} {p['colour']} size {p['size']} {p['description']}"


def main():
    print("Loading catalogue and dev queries...")
    catalogue = load_catalogue()
    product_texts = [build_product_text(p) for p in catalogue]
    product_ids = [p["product_id"] for p in catalogue]

    query_texts = []
    if DEV_PATH.exists():
        with open(DEV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    query_texts.append(" ".join(item["words"]))

    all_texts = product_texts + query_texts
    print(f"Total corpus: {len(product_texts)} products + {len(query_texts)} queries = {len(all_texts)} texts")

    # Use word n-grams (1-2) and character n-grams (3-5) to capture typos, stems, and subwords
    print("Fitting TF-IDF Vectorizer...")
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=1,
        max_features=15000,
        token_pattern=r"(?u)\b\w+\b"
    )
    X_tfidf = vectorizer.fit_transform(all_texts)
    print(f"TF-IDF shape: {X_tfidf.shape}")

    # Latent Semantic Analysis / Dense projection: 128 components
    n_components = 128
    print(f"Fitting TruncatedSVD ({n_components} components)...")
    svd = TruncatedSVD(n_components=n_components, random_state=42)
    svd.fit(X_tfidf)
    explained_var = svd.explained_variance_ratio_.sum()
    print(f"Explained variance ratio: {explained_var:.4f}")

    # Project catalogue products into dense 128-d space
    prod_tfidf = vectorizer.transform(product_texts)
    prod_embeddings = svd.transform(prod_tfidf)  # shape: (1074, 128)

    # L2 normalize so cosine similarity is just dot product: dot(A, B)
    norms = np.linalg.norm(prod_embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    prod_embeddings_norm = (prod_embeddings / norms).astype(np.float32)

    # Save embeddings matrix
    emb_path = MODELS_DIR / "catalogue_embeddings.npy"
    np.save(emb_path, prod_embeddings_norm)
    print(f"Saved catalogue dense embeddings: {emb_path} (shape {prod_embeddings_norm.shape})")

    # Save components as compact float32 npy file
    comp_path = MODELS_DIR / "dense_components.npy"
    components_arr = svd.components_.astype(np.float32)
    np.save(comp_path, components_arr)
    print(f"Saved dense components matrix: {comp_path} (shape {components_arr.shape})")

    # Store vocabulary and IDF in lightweight json
    vocab = {str(k): int(v) for k, v in vectorizer.vocabulary_.items()}
    idf = [float(x) for x in vectorizer.idf_]

    model_meta = {
        "n_components": n_components,
        "product_ids": product_ids,
        "vocabulary": vocab,
        "idf": idf,
    }

    meta_path = MODELS_DIR / "dense_retrieval_meta.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(model_meta, f)
    print(f"Saved dense retrieval metadata: {meta_path} ({meta_path.stat().st_size / 1024:.1f} KB)")

    # Test sample inference speed
    test_queries = ["black sneakers under 3000", "cozy winter bomber jacket", "kudova tempo blue size 8"]
    import time
    for q in test_queries:
        t0 = time.perf_counter()
        q_vec = svd.transform(vectorizer.transform([q]))
        q_norm = q_vec / (np.linalg.norm(q_vec) or 1.0)
        sims = np.dot(prod_embeddings_norm, q_norm[0])
        top_idx = np.argsort(-sims)[:3]
        elapsed_ms = (time.perf_counter() - t0) * 1000
        top_prod = catalogue[top_idx[0]]
        print(f"Query: '{q}' -> Top hit: {top_prod['product_id']} ({top_prod['title']}) [sim: {sims[top_idx[0]]:.3f}] in {elapsed_ms:.2f} ms")


if __name__ == "__main__":
    main()
