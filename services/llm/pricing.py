"""LLM price table loading and per-call cost estimation (issue #228).

Prices live only in the JSON file named by ``settings.LLM_PRICING_FILE``
(default ``data/llm_pricing.json``); this module holds no prices.
"""

import json
import logging
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from config import settings

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]
TOKENS_PER_UNIT = Decimal(1_000_000)
COST_QUANTUM = Decimal("0.00000001")


class PriceTier(BaseModel):
    """Prices in USD per million tokens."""

    input_per_mtok: float = Field(ge=0)
    output_per_mtok: float = Field(ge=0)
    cache_read_per_mtok: float = Field(ge=0)


class LongContextTier(PriceTier):
    """Higher prices that apply when a request's prompt exceeds ``threshold_tokens``."""

    threshold_tokens: int = Field(gt=0)


class PriceEntry(PriceTier):
    """Prices for one provider/model, with when and where they were checked."""

    provider: str
    model: str
    long_context: Optional[LongContextTier] = None
    checked_on: date
    source: str
    notes: Optional[str] = None

    @field_validator("source")
    @classmethod
    def source_is_https_link(cls, value: str) -> str:
        """Require the source to be an https link to the pricing page."""
        if not value.startswith("https://"):
            raise ValueError("source must be an https:// link")
        return value


class PriceTable(BaseModel):
    """Top-level structure of the price table file."""

    currency: str = "USD"
    unit: str = "per_million_tokens"
    description: Optional[str] = None
    models: list[PriceEntry]


def _resolve(path: str) -> Path:
    """Resolve a relative path against the repository root."""
    candidate = Path(path)
    return candidate if candidate.is_absolute() else REPO_ROOT / candidate


@lru_cache(maxsize=None)
def load_price_table(path: Optional[str] = None) -> dict[tuple[str, str], PriceEntry]:
    """Load and validate the price table, keyed by ``(provider, model)``.

    Args:
        path: Price table path; defaults to ``settings.LLM_PRICING_FILE``.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the file is invalid or lists a provider/model twice.
    """
    file_path = _resolve(path or settings.LLM_PRICING_FILE)
    table = PriceTable(**json.loads(file_path.read_text(encoding="utf-8")))
    entries: dict[tuple[str, str], PriceEntry] = {}
    for entry in table.models:
        key = (entry.provider, entry.model)
        if key in entries:
            raise ValueError(f"Duplicate price entry for {entry.provider}/{entry.model}")
        entries[key] = entry
    return entries


def estimate_cost_usd(
    provider: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_read_tokens: int,
    table: Optional[dict[tuple[str, str], PriceEntry]] = None,
) -> Optional[float]:
    """Estimate the USD cost of one call, or ``None`` if the model has no price entry.

    The long-context tier applies when uncached input plus cache reads exceed its
    threshold. The result is rounded to 8 decimal places.
    """
    prices = table if table is not None else load_price_table()
    entry = prices.get((provider, model))
    if entry is None:
        logger.warning("No price entry for %s/%s; cost not estimated", provider, model)
        return None

    tier: PriceTier = entry
    if (
        entry.long_context is not None
        and input_tokens + cache_read_tokens > entry.long_context.threshold_tokens
    ):
        tier = entry.long_context

    cost = (
        Decimal(input_tokens) * Decimal(str(tier.input_per_mtok))
        + Decimal(output_tokens) * Decimal(str(tier.output_per_mtok))
        + Decimal(cache_read_tokens) * Decimal(str(tier.cache_read_per_mtok))
    ) / TOKENS_PER_UNIT
    return float(cost.quantize(COST_QUANTUM, rounding=ROUND_HALF_UP))
