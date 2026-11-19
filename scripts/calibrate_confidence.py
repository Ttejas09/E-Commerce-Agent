"""Offline 5-Fold Cross Validation for Confidence Calibration on data/tune.jsonl.

Uses standard library only.
"""

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from agent.agent import Agent
from evaluate import score_one, summarise, Tools
TUNE_PATH = REPO_ROOT / "data" / "tune.jsonl"


def run_fold(requests, commit_threshold):
    tools = Tools()
    agent = Agent(tools)
    agent.confidence_engine.commit_threshold = commit_threshold

    results = []
    for req in requests:
        tools.searches = 0
        agent.start(req["id"])
        commits, current = [], None
        for t, word in enumerate(req["words"], 1):
            out = agent.observe(word)
            if out and out.get("commit") and out["commit"] != current:
                current = out["commit"]
                commits.append((t, current))
        final = agent.finish() or current
        results.append(score_one(req, commits, final, tools.searches, None))
    return results


def calibrate():
    with open(TUNE_PATH, "r", encoding="utf-8") as f:
        records = [json.loads(line) for line in f if line.strip()]

    print(f"Loaded {len(records)} tune records for 5-fold CV calibration.")
    k = 5
    fold_size = len(records) // k

    thresholds = [0.90, 0.92, 0.94, 0.96, 0.98]
    print("\n--- 5-Fold Out-of-Fold Calibration Results ---")
    print(f"{'Threshold':10} {'Accuracy':8} {'Wrong':6} {'Earliness':10} {'Searches':10} {'Net Score':10}")

    for thresh in thresholds:
        oof_results = []
        for fold in range(k):
            val_start = fold * fold_size
            val_end = val_start + fold_size if fold < k - 1 else len(records)
            val_records = records[val_start:val_end]
            res = run_fold(val_records, thresh)
            oof_results.extend(res)

        s = summarise(oof_results)
        print(f"{thresh:10.2f} {s['accuracy']:8.3f} {s['wrong_commits']:6} {s['early_share']:9.1%} {s['searches']:10.2f} {s['score']:10.2f}")


if __name__ == "__main__":
    calibrate()
