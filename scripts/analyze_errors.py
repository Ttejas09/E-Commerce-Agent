"""Analyze errors from evaluate.py log output.

Usage:
    python scripts/analyze_errors.py results.jsonl
"""

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path


def analyze(log_path: str):
    path = Path(log_path)
    if not path.exists():
        print(f"File not found: {log_path}")
        sys.exit(1)

    with open(path, "r", encoding="utf-8") as f:
        records = [json.loads(line) for line in f if line.strip()]

    n = len(records)
    if n == 0:
        print("No records found.")
        return

    correct_count = sum(1 for r in records if r.get("correct"))
    wrong_commit_count = sum(r.get("wrong_commits", 0) for r in records)
    requests_with_wrong = sum(1 for r in records if r.get("wrong_commits", 0) > 0)
    avg_early_words = sum(r.get("early_words", 0) for r in records) / n
    avg_early_share = sum(r.get("early_share", 0.0) for r in records) / n
    avg_searches = sum(r.get("searches", 0) for r in records) / n
    avg_wasted = sum(r.get("wasted", 0) for r in records) / n
    avg_score = 100 * sum(r.get("score", 0.0) for r in records) / n

    print("=" * 70)
    print(f"EVALUATION ANALYSIS: {path.name} ({n} requests)")
    print("=" * 70)
    print(f"Accuracy:            {correct_count / n:.3f} ({correct_count}/{n})")
    print(f"Wrong Commits:       {wrong_commit_count} in {requests_with_wrong} requests")
    print(f"Earliness:           {avg_early_words:.2f} words ({avg_early_share:.1%})")
    print(f"Searches/req:        {avg_searches:.2f} (wasted: {avg_wasted:.2f})")
    print(f"Net Score:           {avg_score:.2f}")

    # Tag breakdown
    all_tags = sorted({t for r in records for t in r.get("tags", [])}) + ["plain"]
    print("\n--- Breakdown by Tag ---")
    print(f"{'Tag':18} {'Count':5} {'Accuracy':8} {'Wrong':6} {'Earliness':10} {'Score':6}")
    for tag in all_tags:
        tagged = [r for r in records if (tag in r.get("tags", [])) or (tag == "plain" and not r.get("tags"))]
        if tagged:
            tn = len(tagged)
            t_acc = sum(1 for r in tagged if r.get("correct")) / tn
            t_wrong = sum(r.get("wrong_commits", 0) for r in tagged)
            t_early = sum(r.get("early_share", 0.0) for r in tagged) / tn
            t_score = 100 * sum(r.get("score", 0.0) for r in tagged) / tn
            print(f"{tag:18} {tn:5} {t_acc:8.3f} {t_wrong:6} {t_early:9.1%} {t_score:6.1f}")

    # Filter accuracy if reported
    reported_rows = [r for r in records if r.get("filters_reported") is not None and r.get("filters_gold")]
    if reported_rows:
        print(f"\n--- Filter Slot Accuracy ({len(reported_rows)} requests) ---")
        filter_keys = ("category", "colour", "size", "brand", "max_price")
        for k in filter_keys:
            matches = sum(
                1 for r in reported_rows
                if str(r["filters_reported"].get(k)).lower() == str(r["filters_gold"].get(k)).lower()
            )
            print(f"  {k:12} {matches / len(reported_rows):.3f} ({matches}/{len(reported_rows)})")

    # Errors list
    errors = [r for r in records if not r.get("correct")]
    print(f"\n--- Incorrect Requests ({len(errors)}) ---")
    for e in errors[:30]:  # Show first 30
        print(f"[{e['id']}] Target: {e.get('target')} | Predicted: {e.get('final')} | Tags: {e.get('tags', [])}")
        if e.get("filters_reported") and e.get("filters_gold"):
            print(f"   Gold:     {e.get('filters_gold')}")
            print(f"   Reported: {e.get('filters_reported')}")
    if len(errors) > 30:
        print(f"... and {len(errors) - 30} more errors.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/analyze_errors.py <results.jsonl>")
        sys.exit(1)
    analyze(sys.argv[1])
