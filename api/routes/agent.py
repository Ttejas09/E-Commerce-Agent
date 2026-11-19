"""Stateful FastAPI routes wiring the real Anticipatory Commerce Agent."""

import sys
from pathlib import Path
from typing import Dict, Optional, List

# Ensure repo root is on path
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from fastapi import APIRouter, HTTPException

from api.schemas import (
    StartRequest, StartResponse,
    ObserveRequest, ObserveResponse,
    FinishRequest, FinishResponse,
    ProductSummary, FilterState as SchemaFilterState,
    FilterValue as SchemaFilterValue,
    ErrorResponse,
)
from api.session_manager import SessionManager
from agent.agent import Agent
from evaluate import Tools
from search import load_catalogue

router = APIRouter(prefix="/agent", tags=["agent"])
_session_manager = SessionManager(ttl_seconds=600)

# Pre-indexed catalogue lookup by product_id
_CATALOGUE_PRODUCTS: Dict[str, dict] = {
    p["product_id"]: p for p in load_catalogue()
}


def _to_product_summary(p: dict) -> ProductSummary:
    return ProductSummary(
        product_id=p["product_id"],
        title=p.get("title", ""),
        brand=p.get("brand", ""),
        category=p.get("category", ""),
        colour=p.get("colour", ""),
        size=p.get("size", ""),
        price=int(p.get("price", 0)),
    )


def _to_schema_filters(agent_state) -> SchemaFilterState:
    schema_state = SchemaFilterState()
    for slot in ("category", "colour", "size", "brand", "max_price", "min_price"):
        fv = getattr(agent_state, slot, None)
        if fv is not None:
            setattr(
                schema_state,
                slot,
                SchemaFilterValue(
                    value=fv.value,
                    confidence=fv.confidence,
                    word_index=fv.word_index,
                    provenance=fv.provenance,
                ),
            )
    schema_state.residual_tokens = list(agent_state.residual_tokens)
    schema_state.version = agent_state.version
    return schema_state


@router.post("/start", response_model=StartResponse, responses={409: {"model": ErrorResponse}})
async def start(req: StartRequest):
    """Create a new agent session for the given request_id."""
    tools = Tools()
    agent = Agent(tools)
    agent.start(req.request_id)
    try:
        _session_manager.create(request_id=req.request_id, agent=agent)
    except ValueError:
        raise HTTPException(
            status_code=409,
            detail=ErrorResponse(
                error_code="SESSION_EXISTS",
                detail=f"Session '{req.request_id}' already exists",
            ).model_dump(),
        )
    return StartResponse(request_id=req.request_id)


@router.post(
    "/observe",
    response_model=ObserveResponse,
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
)
async def observe(req: ObserveRequest):
    """Process a streaming word observation with concurrency lock and ordering guard."""
    session = _session_manager.get(req.request_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error_code="SESSION_NOT_FOUND",
                detail=f"Session '{req.request_id}' not found",
            ).model_dump(),
        )

    if session.finished:
        raise HTTPException(
            status_code=409,
            detail=ErrorResponse(
                error_code="SESSION_FINISHED",
                detail=f"Session '{req.request_id}' already finished",
            ).model_dump(),
        )

    async with session.lock:
        # Enforce sequential word ordering
        if req.word_index != session.last_word_index + 1:
            raise HTTPException(
                status_code=409,
                detail=ErrorResponse(
                    error_code="OUT_OF_ORDER_WORD",
                    detail=f"Expected word_index {session.last_word_index + 1}, got {req.word_index}",
                ).model_dump(),
            )
        session.last_word_index = req.word_index

        out = session.agent.observe(req.word)

        committed_summary: Optional[ProductSummary] = None
        commit_id = out.get("commit") if out else None
        if commit_id and commit_id in _CATALOGUE_PRODUCTS:
            committed_summary = _to_product_summary(_CATALOGUE_PRODUCTS[commit_id])

        # Extract top candidate summaries
        top_candidates = []
        for r in session.agent.search_ctrl.last_results[:3]:
            pid = r.get("product_id")
            if pid and pid in _CATALOGUE_PRODUCTS:
                top_candidates.append(_to_product_summary(_CATALOGUE_PRODUCTS[pid]))

        confidence = out.get("confidence", 0.5) if out else 0.5
        reason = "commit" if commit_id else "observing"

        return ObserveResponse(
            commit=commit_id,
            committed_product=committed_summary,
            top_candidates=top_candidates,
            filters=_to_schema_filters(session.agent.extractor.state),
            confidence=confidence,
            searches_used=session.agent.search_ctrl.searches_used,
            searches_remaining=session.agent.search_ctrl.searches_remaining,
            reason=reason,
        )


@router.post("/finish", response_model=FinishResponse, responses={404: {"model": ErrorResponse}})
async def finish(req: FinishRequest):
    """Finish the session and return the final predicted product."""
    session = _session_manager.get(req.request_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error_code="SESSION_NOT_FOUND",
                detail=f"Session '{req.request_id}' not found",
            ).model_dump(),
        )

    async with session.lock:
        product_id = session.agent.finish()
        session.finished = True
        _session_manager.remove(req.request_id)

        product_summary = None
        if product_id and product_id in _CATALOGUE_PRODUCTS:
            product_summary = _to_product_summary(_CATALOGUE_PRODUCTS[product_id])

        return FinishResponse(
            product_id=product_id,
            product=product_summary,
            filters=_to_schema_filters(session.agent.extractor.state),
            confidence=1.0 if product_id else 0.0,
            searches_used=session.agent.search_ctrl.searches_used,
        )


# --- Product lookup route (mounted directly on root) ---
_product_router = APIRouter(tags=["products"])


@_product_router.get(
    "/products/{product_id}",
    response_model=ProductSummary,
    responses={404: {"model": ErrorResponse}},
)
async def get_product(product_id: str):
    """Look up a product from the catalogue by ID."""
    p = _CATALOGUE_PRODUCTS.get(product_id)
    if p is None:
        raise HTTPException(
            status_code=404,
            detail=ErrorResponse(
                error_code="PRODUCT_NOT_FOUND",
                detail=f"Product '{product_id}' not found in catalogue",
            ).model_dump(),
        )
    return _to_product_summary(p)


# Include the product router in router
router.include_router(_product_router)
