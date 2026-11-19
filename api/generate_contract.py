"""Generate shared/api_contract.json from api/schemas.py.

Usage:
    python -m api.generate_contract
"""

import json
from pathlib import Path
from api.schemas import (
    StartRequest, StartResponse,
    ObserveRequest, ObserveResponse,
    FinishRequest, FinishResponse,
    ProductSummary, FilterState, FilterValue, FilterKey,
    ErrorResponse,
)

SCHEMA_MODELS = [
    FilterKey,
    FilterValue,
    FilterState,
    ProductSummary,
    StartRequest,
    StartResponse,
    ObserveRequest,
    ObserveResponse,
    FinishRequest,
    FinishResponse,
    ErrorResponse,
]


def generate() -> dict:
    """Return the combined JSON Schema contract for all API models."""
    contract = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "Anticipatory Commerce Agent — API Contract",
        "description": "Auto-generated from api/schemas.py. Do not edit by hand.",
        "schemas": {},
    }
    for model in SCHEMA_MODELS:
        contract["schemas"][model.__name__] = model.model_json_schema()
    return contract


def main() -> None:
    contract = generate()
    out_path = Path(__file__).resolve().parent.parent / "shared" / "api_contract.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(contract, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
