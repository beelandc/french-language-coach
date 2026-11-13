"""Tests for issue #228: GET /metrics/llm."""

from types import SimpleNamespace

import pytest

from models.llm_call import LLMCall
from routers.metrics import percentile, summarize


async def add_calls(db, specs):
    """Insert llm_calls rows from (feature, provider, model, latency_ms, cost, status) tuples."""
    for feature, provider, model, latency, cost, status in specs:
        db.add(
            LLMCall(
                feature=feature,
                provider=provider,
                model=model,
                input_tokens=100,
                output_tokens=10,
                cache_read_tokens=5,
                latency_ms=latency,
                estimated_cost_usd=cost,
                status=status,
            )
        )
    await db.commit()


class TestPercentile:
    def test_nearest_rank(self):
        values = [100, 200, 300, 400, 1000]
        assert percentile(values, 50) == 300
        assert percentile(values, 95) == 1000

    def test_unsorted_input(self):
        assert percentile([1000, 100, 300, 200, 400], 50) == 300

    def test_single_value(self):
        assert percentile([42], 50) == 42
        assert percentile([42], 95) == 42

    def test_empty(self):
        assert percentile([], 50) is None

    def test_zeroth_percentile_is_minimum(self):
        assert percentile([3, 1, 2], 0) == 1


class TestSummarize:
    def test_counts_unpriced_and_errors(self):
        rows = [
            SimpleNamespace(latency_ms=10, estimated_cost_usd=0.5, status="success",
                            input_tokens=1, output_tokens=2, cache_read_tokens=3),
            SimpleNamespace(latency_ms=20, estimated_cost_usd=None, status="error",
                            input_tokens=None, output_tokens=None, cache_read_tokens=None),
        ]
        stats = summarize(rows)
        assert stats["calls"] == 2
        assert stats["errors"] == 1
        assert stats["unpriced_calls"] == 1
        assert stats["estimated_cost_usd"] == 0.5
        assert (stats["input_tokens"], stats["output_tokens"], stats["cache_read_tokens"]) == (1, 2, 3)


class TestMetricsEndpoint:
    @pytest.mark.asyncio
    async def test_empty_table(self, client):
        response = client.get("/metrics/llm")

        assert response.status_code == 200
        data = response.json()
        assert data["groups"] == []
        assert data["totals"]["calls"] == 0
        assert data["totals"]["estimated_cost_usd"] == 0
        assert data["totals"]["latency_p50_ms"] is None
        assert data["totals"]["latency_p95_ms"] is None

    @pytest.mark.asyncio
    async def test_totals_and_percentiles_by_feature_and_model(self, client, test_db):
        # Given calls across two features and two models
        await add_calls(test_db, [
            ("chat", "mistral", "mistral-large-latest", 100, 0.001, "success"),
            ("chat", "mistral", "mistral-large-latest", 200, 0.001, "success"),
            ("chat", "mistral", "mistral-large-latest", 300, 0.001, "success"),
            ("chat", "mistral", "mistral-large-latest", 400, 0.001, "success"),
            ("chat", "mistral", "mistral-large-latest", 1000, 0.001, "error"),
            ("feedback", "anthropic", "claude-sonnet-5-5", 2000, 0.008, "success"),
            ("feedback", "anthropic", "claude-sonnet-5-5", 3000, None, "success"),
        ])

        # When
        data = client.get("/metrics/llm").json()

        # Then: groups are sorted by feature, provider, model
        chat, feedback = data["groups"]
        assert (chat["feature"], chat["provider"], chat["model"]) == ("chat", "mistral", "mistral-large-latest")
        assert chat["calls"] == 5
        assert chat["errors"] == 1
        assert chat["latency_p50_ms"] == 300
        assert chat["latency_p95_ms"] == 1000
        assert chat["estimated_cost_usd"] == pytest.approx(0.005)
        assert chat["input_tokens"] == 500
        assert chat["output_tokens"] == 50
        assert chat["cache_read_tokens"] == 25

        assert (feedback["feature"], feedback["model"]) == ("feedback", "claude-sonnet-5-5")
        assert feedback["unpriced_calls"] == 1
        assert feedback["estimated_cost_usd"] == pytest.approx(0.008)
        assert feedback["latency_p50_ms"] == 2000
        assert feedback["latency_p95_ms"] == 3000

        totals = data["totals"]
        assert totals["calls"] == 7
        assert totals["errors"] == 1
        assert totals["unpriced_calls"] == 1
        assert totals["estimated_cost_usd"] == pytest.approx(0.013)
        assert totals["latency_p50_ms"] == 400
        assert totals["latency_p95_ms"] == 3000

    @pytest.mark.asyncio
    async def test_same_model_different_features_are_separate_groups(self, client, test_db):
        await add_calls(test_db, [
            ("chat", "anthropic", "claude-haiku-5-5", 50, 0.0001, "success"),
            ("feedback", "anthropic", "claude-haiku-5-5", 500, 0.0004, "success"),
        ])

        groups = client.get("/metrics/llm").json()["groups"]

        assert [g["feature"] for g in groups] == ["chat", "feedback"]
