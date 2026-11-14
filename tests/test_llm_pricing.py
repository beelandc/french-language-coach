"""Tests for issue #228: LLM price table and cost estimation."""

import json
from datetime import date

import pytest
from pydantic import ValidationError

from services.llm.pricing import REPO_ROOT, estimate_cost_usd, load_price_table


def write_table(tmp_path, models, name="prices.json"):
    """Write a price table file and return its absolute path as a string."""
    path = tmp_path / name
    path.write_text(json.dumps({"currency": "USD", "unit": "per_million_tokens", "models": models}))
    return str(path)


def entry(**overrides):
    base = {
        "provider": "acme",
        "model": "acme-1",
        "input_per_mtok": 1.0,
        "output_per_mtok": 2.0,
        "cache_read_per_mtok": 0.1,
        "checked_on": "2026-11-13",
        "source": "https://example.com/pricing",
    }
    base.update(overrides)
    return base


class TestShippedPriceTable:
    """The real data/llm_pricing.json (AC4)."""

    def test_covers_default_and_evaluation_models(self):
        table = load_price_table()
        for key in [
            ("mistral", "mistral-large-latest"),
            ("anthropic", "claude-sonnet-5-5"),
            ("anthropic", "claude-haiku-5-5"),
            ("anthropic", "claude-opus-5-5"),
        ]:
            assert key in table

    def test_every_entry_has_date_and_https_source(self):
        for item in load_price_table().values():
            assert isinstance(item.checked_on, date)
            assert item.source.startswith("https://")

    def test_default_path_resolves_relative_to_repo_root(self):
        assert load_price_table() == load_price_table(str(REPO_ROOT / "data/llm_pricing.json"))


class TestEstimateCost:
    def test_mistral_example_from_prompt(self):
        # 1000 uncached in, 150 out, 200 cached -> (1000*0.50 + 150*1.50 + 200*0.05) / 1e6
        assert estimate_cost_usd("mistral", "mistral-large-latest", 1000, 150, 200) == 0.000735

    def test_claude_haiku_cost(self):
        assert estimate_cost_usd("anthropic", "claude-haiku-5-5", 2000, 400, 0) == 0.0004

    def test_claude_sonnet_cost(self):
        assert estimate_cost_usd("anthropic", "claude-sonnet-5-5", 2000, 400, 0) == 0.008

    def test_haiku_long_context_tier_applies_above_threshold(self):
        assert estimate_cost_usd("anthropic", "claude-haiku-5-5", 150000, 1000, 0) == 0.0775

    def test_long_context_threshold_counts_cache_reads(self):
        # 60k uncached + 50k cached = 110k prompt -> long-context prices
        cost = estimate_cost_usd("anthropic", "claude-haiku-5-5", 60000, 0, 50000)
        assert cost == pytest.approx((60000 * 0.50 + 50000 * 0.05) / 1e6)

    def test_at_threshold_uses_base_tier(self):
        cost = estimate_cost_usd("anthropic", "claude-haiku-5-5", 100000, 0, 0)
        assert cost == pytest.approx(100000 * 0.10 / 1e6)

    def test_unknown_model_returns_none(self, caplog):
        assert estimate_cost_usd("anthropic", "claude-unknown", 10, 10, 0) is None
        assert "No price entry" in caplog.text

    def test_zero_tokens_cost_zero(self):
        assert estimate_cost_usd("mistral", "mistral-large-latest", 0, 0, 0) == 0.0

    def test_explicit_table_is_used(self, tmp_path):
        table = load_price_table(write_table(tmp_path, [entry()]))
        assert estimate_cost_usd("acme", "acme-1", 1_000_000, 1_000_000, 1_000_000, table=table) == 3.1

    def test_rounds_to_eight_decimals(self, tmp_path):
        # 1 token at $0.123456789/MTok = $0.000000123456789 -> $0.00000012
        table = load_price_table(write_table(tmp_path, [entry(input_per_mtok=0.123456789)]))
        assert estimate_cost_usd("acme", "acme-1", 1, 0, 0, table=table) == 0.00000012


class TestLoadPriceTableValidation:
    def test_duplicate_entries_rejected(self, tmp_path):
        with pytest.raises(ValueError, match="Duplicate"):
            load_price_table(write_table(tmp_path, [entry(), entry()]))

    def test_non_https_source_rejected(self, tmp_path):
        with pytest.raises(ValidationError):
            load_price_table(write_table(tmp_path, [entry(source="http://example.com")]))

    def test_negative_price_rejected(self, tmp_path):
        with pytest.raises(ValidationError):
            load_price_table(write_table(tmp_path, [entry(output_per_mtok=-1)]))

    def test_missing_checked_on_rejected(self, tmp_path):
        bad = entry()
        del bad["checked_on"]
        with pytest.raises(ValidationError):
            load_price_table(write_table(tmp_path, [bad]))

    def test_missing_file_raises(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            load_price_table(str(tmp_path / "missing.json"))
