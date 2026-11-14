"""Tests for issue #228: GET /metrics/llm, and issue #236: the metrics analysis endpoints."""

from datetime import datetime
from types import SimpleNamespace

import pytest

import routers.metrics as metrics_router
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


# ---------------------------------------------------------------------------
# Issue #236: filters, call log, time series, pricing and comparison report
# ---------------------------------------------------------------------------

DAY = datetime(2026, 11, 13)


async def add_call(db, *, feature="chat", provider="mistral", model="mistral-large-latest",
                   created_at=None, status="success", error_message=None, latency_ms=1000,
                   estimated_cost_usd=0.001, session_id=None, count=1):
    """Insert ``count`` llm_calls rows with explicit created_at/error_message."""
    for _ in range(count):
        db.add(
            LLMCall(
                feature=feature, provider=provider, model=model, session_id=session_id,
                input_tokens=100, output_tokens=10, cache_read_tokens=0,
                latency_ms=latency_ms, estimated_cost_usd=estimated_cost_usd,
                status=status, error_message=error_message,
                created_at=created_at or DAY.replace(hour=10),
            )
        )
    await db.commit()


class TestMetricsFilters:
    @pytest.mark.asyncio
    async def test_feature_and_status_filters(self, client, test_db):
        # Given
        await add_call(test_db)
        await add_call(test_db, status="error", error_message="boom")
        await add_call(test_db, feature="feedback", provider="anthropic", model="claude-sonnet-5-5")

        # When
        data = client.get("/metrics/llm?feature=chat&status=error").json()

        # Then
        assert data["totals"]["calls"] == 1
        assert [(g["feature"], g["provider"], g["errors"]) for g in data["groups"]] == [
            ("chat", "mistral", 1)
        ]

    @pytest.mark.asyncio
    async def test_provider_and_model_filters(self, client, test_db):
        await add_call(test_db)
        await add_call(test_db, provider="anthropic", model="claude-haiku-5-5")
        await add_call(test_db, provider="anthropic", model="claude-sonnet-5-5")

        assert client.get("/metrics/llm?provider=anthropic").json()["totals"]["calls"] == 2
        assert client.get("/metrics/llm?model=claude-haiku-5-5").json()["totals"]["calls"] == 1
        assert client.get("/metrics/llm?feature=unknown").json()["groups"] == []

    @pytest.mark.asyncio
    async def test_date_only_date_to_covers_whole_day(self, client, test_db):
        await add_call(test_db, created_at=datetime(2026, 11, 12, 23, 59))
        await add_call(test_db, created_at=datetime(2026, 11, 13, 23, 30))
        await add_call(test_db, created_at=datetime(2026, 11, 14, 0, 5))

        data = client.get("/metrics/llm?date_from=2026-11-13&date_to=2026-11-13").json()

        assert data["totals"]["calls"] == 1

    @pytest.mark.asyncio
    async def test_datetime_bounds_with_utc_offset(self, client, test_db):
        await add_call(test_db, created_at=datetime(2026, 11, 13, 7, 59))
        await add_call(test_db, created_at=datetime(2026, 11, 13, 8, 0))

        # 10:00+02:00 is 08:00 UTC ('+' encoded as %2B)
        url = "/metrics/llm?date_from=2026-11-13T10:00:00%2B02:00"
        assert client.get(url).json()["totals"]["calls"] == 1
        assert client.get("/metrics/llm?date_to=2026-11-13T08:00:00Z").json()["totals"]["calls"] == 2

    @pytest.mark.parametrize("query, field", [
        ("status=pending", "status"),
        ("bucket=week", "bucket"),
    ])
    def test_invalid_enum_values_return_422(self, client, query, field):
        path = "/metrics/llm/timeseries" if field == "bucket" else "/metrics/llm"
        response = client.get(f"{path}?{query}")
        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"] == ["query", field]

    @pytest.mark.parametrize("query, message", [
        ("date_from=2026-11-14&date_to=2026-11-13", "date_from must be less than or equal to date_to"),
        ("date_from=yesterday", "Invalid date_from 'yesterday'"),
        ("date_to=2026-11-13T10:00:00+02:00", "Invalid date_to"),  # unencoded '+'
    ])
    @pytest.mark.parametrize("path", ["/metrics/llm", "/metrics/llm/calls",
                                      "/metrics/llm/timeseries", "/metrics/llm/report"])
    def test_invalid_dates_return_400(self, client, path, query, message):
        response = client.get(f"{path}?{query}")
        assert response.status_code == 400
        assert message in response.json()["detail"]


class TestCallLog:
    @pytest.mark.asyncio
    async def test_newest_first_with_pagination(self, client, test_db):
        # Given calls at 10:00, 11:00, 12:00
        for hour in (10, 11, 12):
            await add_call(test_db, created_at=DAY.replace(hour=hour), latency_ms=hour)

        # When
        first = client.get("/metrics/llm/calls?per_page=2").json()
        second = client.get("/metrics/llm/calls?per_page=2&page=2").json()

        # Then
        assert [c["latency_ms"] for c in first["calls"]] == [12, 11]
        assert first["pagination"] == {"total": 3, "page": 1, "per_page": 2, "total_pages": 2}
        assert [c["latency_ms"] for c in second["calls"]] == [10]

    @pytest.mark.asyncio
    async def test_item_fields(self, client, test_db):
        await add_call(test_db, status="error", error_message="refusal: cyber", session_id=7,
                       estimated_cost_usd=None, provider="anthropic", model="claude-haiku-5-5")

        (item,) = client.get("/metrics/llm/calls").json()["calls"]

        assert set(item) == {
            "id", "created_at", "feature", "provider", "model", "session_id", "input_tokens",
            "output_tokens", "cache_read_tokens", "latency_ms", "estimated_cost_usd",
            "status", "error_message",
        }
        assert item["session_id"] == 7
        assert item["error_message"] == "refusal: cyber"
        assert item["estimated_cost_usd"] is None
        assert item["created_at"] == "2026-11-13T10:00:00"

    @pytest.mark.asyncio
    async def test_ties_broken_by_id_descending(self, client, test_db):
        await add_call(test_db, latency_ms=1)
        await add_call(test_db, latency_ms=2)

        calls = client.get("/metrics/llm/calls").json()["calls"]

        assert [c["latency_ms"] for c in calls] == [2, 1]

    @pytest.mark.asyncio
    async def test_filters_apply(self, client, test_db):
        await add_call(test_db, count=3)
        await add_call(test_db, status="error", error_message="boom", count=2)

        data = client.get("/metrics/llm/calls?status=error").json()

        assert data["pagination"]["total"] == 2
        assert {c["status"] for c in data["calls"]} == {"error"}

    @pytest.mark.asyncio
    async def test_page_past_the_end_and_empty_table(self, client, test_db):
        empty = client.get("/metrics/llm/calls").json()
        assert empty == {"calls": [], "pagination": {"total": 0, "page": 1, "per_page": 10, "total_pages": 0}}

        await add_call(test_db)
        past = client.get("/metrics/llm/calls?page=5").json()
        assert past["calls"] == []
        assert past["pagination"]["total"] == 1

    @pytest.mark.parametrize("query", ["per_page=0", "per_page=101", "page=0"])
    def test_invalid_pagination_returns_422(self, client, query):
        assert client.get(f"/metrics/llm/calls?{query}").status_code == 422


class TestTimeseriesEndpoint:
    @pytest.mark.asyncio
    async def test_hour_and_day_buckets(self, client, test_db):
        await add_call(test_db, created_at=DAY.replace(hour=10, minute=5))
        await add_call(test_db, created_at=DAY.replace(hour=10, minute=40))
        await add_call(test_db, created_at=DAY.replace(hour=11, minute=10))

        hourly = client.get("/metrics/llm/timeseries?bucket=hour").json()
        daily = client.get("/metrics/llm/timeseries").json()

        assert hourly["bucket"] == "hour"
        assert [(p["bucket_start"], p["calls"]) for p in hourly["points"]] == [
            ("2026-11-13T10:00:00", 2), ("2026-11-13T11:00:00", 1),
        ]
        assert daily["bucket"] == "day"
        (point,) = daily["points"]
        assert point["bucket_start"] == "2026-11-13T00:00:00"
        assert (point["feature"], point["provider"], point["model"]) == ("chat", "mistral", "mistral-large-latest")
        assert point["calls"] == 3
        assert point["estimated_cost_usd"] == pytest.approx(0.003)
        assert point["latency_p50_ms"] == 1000

    @pytest.mark.asyncio
    async def test_filters_apply(self, client, test_db):
        await add_call(test_db)
        await add_call(test_db, feature="feedback")

        points = client.get("/metrics/llm/timeseries?feature=feedback").json()["points"]

        assert [p["feature"] for p in points] == ["feedback"]


class TestPricingEndpoint:
    def test_returns_price_table_with_dates_and_sources(self, client):
        data = client.get("/metrics/llm/pricing").json()

        assert data["currency"] == "USD"
        assert data["unit"] == "per_million_tokens"
        models = {(m["provider"], m["model"]): m for m in data["models"]}
        assert ("mistral", "mistral-large-latest") in models
        haiku = models[("anthropic", "claude-haiku-5-5")]
        assert haiku["checked_on"] and haiku["source"].startswith("https://")
        assert haiku["long_context"]["threshold_tokens"] == 100000


class TestReportEndpoint:
    async def seed(self, db):
        await add_call(db, latency_ms=1000, estimated_cost_usd=0.001, count=20)
        await add_call(db, provider="anthropic", model="claude-haiku-5-5", latency_ms=600,
                       estimated_cost_usd=0.00025, count=18)
        await add_call(db, provider="anthropic", model="claude-haiku-5-5", status="error",
                       error_message="refusal: cyber", latency_ms=50,
                       estimated_cost_usd=0.00025, count=2)

    @pytest.mark.asyncio
    async def test_json_report(self, client, test_db):
        await self.seed(test_db)

        response = client.get("/metrics/llm/report")

        assert response.status_code == 200
        data = response.json()
        (chat,) = data["features"]
        base, haiku = chat["rows"]
        assert base["is_baseline"] and base["deltas"] is None
        assert (haiku["calls"], haiku["errors"], haiku["refusals"]) == (20, 2, 2)
        assert haiku["error_rate"] == 0.1
        assert haiku["latency_p50_ms"] == 600
        assert haiku["deltas"]["latency_p50_pct"] == -40.0
        assert haiku["deltas"]["mean_cost_per_call_pct"] == -75.0
        assert haiku["deltas"]["error_rate_pp"] == 10.0
        assert haiku["cost_per_1000_calls_usd"] == pytest.approx(0.25)
        meta = data["metadata"]
        assert meta["baseline"] == "mistral:mistral-large-latest"
        assert meta["latency_basis"] == "successful calls"
        assert {(p["provider"], p["model"]) for p in meta["prices"]} == {
            ("mistral", "mistral-large-latest"), ("anthropic", "claude-haiku-5-5"),
        }
        assert meta["warnings"] == []

    @pytest.mark.asyncio
    async def test_custom_baseline_and_sample_warning(self, client, test_db):
        await add_call(test_db, count=20)
        await add_call(test_db, provider="anthropic", model="claude-haiku-5-5", count=3)

        data = client.get("/metrics/llm/report?baseline=anthropic:claude-haiku-5-5").json()

        base, mistral = data["features"][0]["rows"]
        assert (base["model"], base["is_baseline"]) == ("claude-haiku-5-5", True)
        assert mistral["deltas"] is not None
        assert "anthropic:claude-haiku-5-5 (chat): sample size 3 is below 20" in data["metadata"]["warnings"]

    @pytest.mark.asyncio
    async def test_filters_echoed(self, client, test_db):
        await self.seed(test_db)

        data = client.get("/metrics/llm/report?feature=chat&date_from=2026-11-13").json()

        assert data["metadata"]["filters"]["feature"] == "chat"
        assert data["metadata"]["filters"]["date_from"] == "2026-11-13"
        assert data["metadata"]["covered_from"] == "2026-11-13T10:00:00"

    @pytest.mark.asyncio
    async def test_markdown_download(self, client, test_db):
        await self.seed(test_db)

        response = client.get("/metrics/llm/report?format=markdown")

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/markdown")
        disposition = response.headers["content-disposition"]
        assert disposition.startswith('attachment; filename="llm-model-report-')
        assert disposition.endswith('.md"')
        assert response.text.startswith("# LLM model comparison report")
        assert "## Feature: chat" in response.text

    @pytest.mark.asyncio
    async def test_csv_download(self, client, test_db):
        await self.seed(test_db)

        response = client.get("/metrics/llm/report?format=csv")

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/csv")
        assert response.headers["content-disposition"].endswith('.csv"')
        lines = response.text.strip().splitlines()
        assert lines[0].startswith("feature,provider,model,is_baseline,calls")
        assert len(lines) == 3

    def test_empty_report(self, client):
        data = client.get("/metrics/llm/report").json()
        assert data["features"] == []
        assert data["metadata"]["covered_from"] is None

    @pytest.mark.parametrize("baseline", ["mistral", ":model", "provider:"])
    def test_bad_baseline_returns_400(self, client, baseline):
        response = client.get(f"/metrics/llm/report?baseline={baseline}")
        assert response.status_code == 400
        assert "baseline must be 'provider:model'" in response.json()["detail"]

    def test_bad_format_returns_422(self, client):
        response = client.get("/metrics/llm/report?format=pdf")
        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"] == ["query", "format"]

    @pytest.mark.asyncio
    async def test_price_table_failure_is_a_warning(self, client, test_db, monkeypatch):
        await add_call(test_db, count=20)

        def broken():
            raise FileNotFoundError("missing")

        monkeypatch.setattr(metrics_router, "load_price_table", broken)
        data = client.get("/metrics/llm/report").json()

        assert data["metadata"]["prices"] == []
        assert data["metadata"]["warnings"] == [
            "Price table could not be loaded; price check dates are missing"
        ]
