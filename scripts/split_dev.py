"""Stratified train/holdout split of dev.jsonl (200 tune / 100 holdout).

Uses Python standard library only.
"""

import json
import random
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEV_PATH = REPO_ROOT / "dev.jsonl"
TUNE_PATH = REPO_ROOT / "data" / "tune.jsonl"
HOLDOUT_PATH = REPO_ROOT / "data" / "holdout.jsonl"


def split_dev(seed: int = 42, holdout_ratio: float = 0.3333):
    random.seed(seed)

    with open(DEV_PATH, "r", encoding="utf-8") as f:
        records = [json.loads(line) for line in f if line.strip()]

    print(f"Total dev records: {len(records)}")

    # Group by exact tag set
    groups = defaultdict(list)
    for rec in records:
        tags = rec.get("tags", [])
        key = frozenset(tags) if tags else frozenset(["plain"])
        groups[key].append(rec)

    tune_records = []
    holdout_records = []

    for tag_key, group in sorted(groups.items(), key=lambda x: str(sorted(list(x[0])))):
        random.shuffle(group)
        n = len(group)
        n_holdout = round(n * holdout_ratio)
        # Ensure at least 1 in holdout if n >= 2
        if n >= 2 and n_holdout == 0:
            n_holdout = 1
        elif n_holdout >= n:
            n_holdout = n - 1

        holdout_part = group[:n_holdout]
        tune_part = group[n_holdout:]

        tune_records.extend(tune_part)
        holdout_records.extend(holdout_part)

    # If we need exact 200 / 100
    while len(holdout_records) > 100:
        # Move one from the largest group from holdout to tune
        moved = holdout_records.pop()
        tune_records.append(moved)
    while len(holdout_records) < 100 and tune_records:
        moved = tune_records.pop()
        holdout_records.append(moved)

    # Sort each by id for consistency
    tune_records.sort(key=lambda r: r["id"])
    holdout_records.sort(key=lambda r: r["id"])

    TUNE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(TUNE_PATH, "w", encoding="utf-8") as f:
        for r in tune_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    with open(HOLDOUT_PATH, "w", encoding="utf-8") as f:
        for r in holdout_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"Wrote {len(tune_records)} records to {TUNE_PATH}")
    print(f"Wrote {len(holdout_records)} records to {HOLDOUT_PATH}")

    # Print distribution
    print("\nTag distribution:")
    all_tags = set()
    for r in records:
        all_tags.update(r.get("tags", []))
    all_tags.add("plain")

    for tag in sorted(all_tags):
        def count_tag(recs):
            return sum(1 for r in recs if (tag in r.get("tags", [])) or (tag == "plain" and not r.get("tags")))
        total_c = count_tag(records)
        tune_c = count_tag(tune_records)
        hold_c = count_tag(holdout_records)
        print(f"  {tag:17} Total: {total_c:3} | Tune: {tune_c:3} ({tune_c/len(tune_records):.1%}) | Holdout: {hold_c:3} ({hold_c/len(holdout_records):.1%})")


if __name__ == "__main__":
    split_dev()
