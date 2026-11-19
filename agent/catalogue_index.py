"""Build in-memory indexes from catalogue.csv for fast filter validation."""

import csv
from collections import defaultdict
from pathlib import Path
from typing import Dict, Optional, Set

_DEFAULT_CSV = Path(__file__).resolve().parent.parent / "catalogue.csv"


def _build_index(csv_path: Path = _DEFAULT_CSV):
    """Read catalogue.csv once and return all index structures."""
    categories: Set[str] = set()
    brands_original: Set[str] = set()
    brands_lower: Dict[str, str] = {}
    colours: Set[str] = set()
    category_sizes: Dict[str, Set[str]] = defaultdict(set)
    size_categories: Dict[str, Set[str]] = defaultdict(set)
    brand_categories: Dict[str, Set[str]] = defaultdict(set)
    category_brands: Dict[str, Set[str]] = defaultdict(set)
    all_sizes: Set[str] = set()

    with open(csv_path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            cat = row.get("category", "").strip().lower()
            brand = row.get("brand", "").strip()
            colour = row.get("colour", "").strip().lower()
            size = row.get("size", "").strip()

            if cat:
                categories.add(cat)
            if brand:
                brands_original.add(brand)
                brands_lower[brand.lower()] = brand
                if cat:
                    brand_categories[brand.lower()].add(cat)
                    category_brands[cat].add(brand.lower())
            if colour:
                colours.add(colour)
            if size:
                s_low = size.lower()
                all_sizes.add(s_low)
                if cat:
                    category_sizes[cat].add(s_low)
                    size_categories[s_low].add(cat)

    return (
        categories,
        brands_original,
        brands_lower,
        colours,
        dict(category_sizes),
        dict(size_categories),
        dict(brand_categories),
        dict(category_brands),
        all_sizes,
    )


(
    CATEGORIES,
    BRANDS,
    BRANDS_LOWER,
    COLOURS,
    CATEGORY_SIZES,
    SIZE_CATEGORIES,
    BRAND_CATEGORIES,
    CATEGORY_BRANDS,
    ALL_SIZES,
) = _build_index()


def is_valid_size(size: str, category: Optional[str] = None) -> bool:
    """Check whether size is valid, optionally within a specific category."""
    s = size.lower()
    if category is not None:
        cat_sizes = CATEGORY_SIZES.get(category.lower(), set())
        return s in cat_sizes
    return s in ALL_SIZES


def get_categories_for_size(size: str) -> Set[str]:
    """Return the set of categories that carry size."""
    return SIZE_CATEGORIES.get(size.lower(), set())


def get_categories_for_brand(brand: str) -> Set[str]:
    """Return the set of categories that brand produces."""
    return BRAND_CATEGORIES.get(brand.lower(), set())
