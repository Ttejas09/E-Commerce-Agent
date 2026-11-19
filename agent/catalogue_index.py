"""Build in-memory indexes from catalogue.csv for fast filter validation."""

import csv
from collections import defaultdict
from pathlib import Path
from typing import Dict, Optional, Set

# Default path: <repo_root>/catalogue.csv  (agent/ is one level below repo root)
_DEFAULT_CSV = Path(__file__).resolve().parent.parent / "catalogue.csv"


def _build_index(csv_path: Path = _DEFAULT_CSV):
    """Read catalogue.csv once and return all index structures."""
    categories: Set[str] = set()
    brands_original: Set[str] = set()          # original casing
    brands_lower: Dict[str, str] = {}          # lowercase → original
    colours: Set[str] = set()
    category_sizes: Dict[str, Set[str]] = defaultdict(set)
    size_categories: Dict[str, Set[str]] = defaultdict(set)
    all_sizes: Set[str] = set()

    with open(csv_path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            cat = row.get("category", "").strip()
            brand = row.get("brand", "").strip()
            colour = row.get("colour", "").strip()
            size = row.get("size", "").strip()

            if cat:
                categories.add(cat.lower())
            if brand:
                brands_original.add(brand)
                brands_lower[brand.lower()] = brand
            if colour:
                colours.add(colour.lower())
            if size:
                s_low = size.lower()
                all_sizes.add(s_low)
                if cat:
                    c_low = cat.lower()
                    category_sizes[c_low].add(s_low)
                    size_categories[s_low].add(c_low)

    return (
        categories,
        brands_original,
        brands_lower,
        colours,
        dict(category_sizes),
        dict(size_categories),
        all_sizes,
    )


# ---------------------------------------------------------------------------
# Module-level singletons (populated on first import)
# ---------------------------------------------------------------------------
(
    CATEGORIES,
    BRANDS,
    BRANDS_LOWER,
    COLOURS,
    CATEGORY_SIZES,
    SIZE_CATEGORIES,
    ALL_SIZES,
) = _build_index()


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def is_valid_size(size: str, category: Optional[str] = None) -> bool:
    """Check whether *size* is valid, optionally within a specific category."""
    s = size.lower()
    if category is not None:
        cat_sizes = CATEGORY_SIZES.get(category.lower(), set())
        return s in cat_sizes
    return s in ALL_SIZES


def get_categories_for_size(size: str) -> Set[str]:
    """Return the set of categories that carry *size*."""
    return SIZE_CATEGORIES.get(size.lower(), set())
