from pydantic import BaseModel, Field
from typing import Optional, List, Union
from enum import Enum


class FilterKey(str, Enum):
    CATEGORY = "category"
    COLOUR = "colour"
    SIZE = "size"
    BRAND = "brand"
    MAX_PRICE = "max_price"
    MIN_PRICE = "min_price"


class FilterValue(BaseModel):
    value: Union[str, int]
    confidence: float = Field(ge=0.0, le=1.0)
    word_index: int
    provenance: List[str]


class FilterState(BaseModel):
    category: Optional[FilterValue] = None
    colour: Optional[FilterValue] = None
    size: Optional[FilterValue] = None
    brand: Optional[FilterValue] = None
    max_price: Optional[FilterValue] = None
    min_price: Optional[FilterValue] = None
    residual_tokens: List[str] = Field(default_factory=list)
    version: int = 0


class ProductSummary(BaseModel):
    product_id: str
    title: str
    brand: str
    category: str
    colour: str
    size: str
    price: int


class StartRequest(BaseModel):
    request_id: str


class StartResponse(BaseModel):
    status: str = "ready"
    request_id: str


class ObserveRequest(BaseModel):
    request_id: str
    word: str
    word_index: int = Field(ge=1)
    is_final: bool = False


class ObserveResponse(BaseModel):
    commit: Optional[str] = None
    committed_product: Optional[ProductSummary] = None
    top_candidates: List[ProductSummary] = Field(default_factory=list)
    filters: FilterState
    confidence: float = Field(ge=0.0, le=1.0)
    searches_used: int
    searches_remaining: int
    reason: str


class FinishRequest(BaseModel):
    request_id: str


class FinishResponse(BaseModel):
    product_id: Optional[str] = None
    product: Optional[ProductSummary] = None
    filters: FilterState
    confidence: float = Field(ge=0.0, le=1.0)
    searches_used: int


class ErrorResponse(BaseModel):
    error_code: str
    detail: str
