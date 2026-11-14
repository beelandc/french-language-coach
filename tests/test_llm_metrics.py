"""Tests for issue #236: services/llm/metrics.py (filters, time series, report, rendering)."""

import csv
import io
import json
from datetime import date, datetime
from types import SimpleNamespace

import pytest

from services.llm.metrics import (
    CSV_COLUMNS,
    MIN_SAMPLE_SIZE,
    REPORT_NOTES,
    MetricsFilters,
    build_filters,
    build_report,
    build_timeseries,
    bucket_start,
    parse_baseline,
    parse_date_bound,
    render_report_csv,
    render_report_markdown,
    report_filename,
)
from services.llm.pricing import PriceEntry, load_price_document, load_price_table

T0 = datetime(2026, 11, 13, 10, 0)
GENERATED = datetime(2026, 11, 14, 7, 18, 5)
MISTRAL = ("mistral", "mistral-large-latest")
HAIKU = ("anthropic", "claude-haiku-5-5")


def row(feature="chat", provider="mistral", model="mistral-large-latest", *,
        created_at=T0, status="success", error_message=None, input_tokens=100,
        output_tokens=10, cache_read_tokens=0, latency_ms=1000, estimated_cost_usd=0.001):
    """Build an in-memory llm_calls row."""
    return SimpleNamespace(
        created_at=created_at, feature=feature, provider=provider, model=model,
        status=status, error_message=error_message, input_tokens=input_tokens,
        output_tokens=output_tokens, cache_read_tokens=cache_read_tokens,
        latency_ms=latency_ms, estimated_cost_usd=estimated_cost_usd,
    )


def rows_for(key, n, **kwargs):
    provider, model = key
    return [row(provider=provider, model=model, **kwargs) for _ in range(n)]


def price(provider, model, checked_on=date(2026, 11, 13)):
    return PriceEntry(
        provider=provider, model=model, input_per_mtok=1, output_per_mtok=1,
        cache_read_per_mtok=0.1, checked_on=checked_on, source="https://example.com/pricing",
    )


def report(rows, *, baseline="mistral:mistral-large-latest", filters=None, prices=None, **kw):
    return build_report(rows, filters or MetricsFilters(), baseline, prices or {},
                        generated_at=GENERATED, **kw)


class TestParseDateBound:
    def test_date_only_start_is_midnight(self):
        assert parse_date_bound("2026-11-13", is_end=False) == datetime(2026, 11, 13)

    def test_date_only_end_is_next_midnight(self):
        assert parse_date_bound("2026-11-13", is_end=True) == datetime(2026, 11, 14)

    def test_naive_datetime_is_exact_start(self):
        assert parse_date_bound("2026-11-13T10:30:00", is_end=False) == datetime(2026, 11, 13, 10, 30)

    def test_datetime_end_includes_the_instant(self):
        end = parse_date_bound("2026-11-13T10:30:00", is_end=True)
        assert end == datetime(2026, 11, 13, 10, 30, 0, 1)

    def test_offset_converted_to_utc(self):
        assert parse_date_bound("2026-11-13T10:00:00+02:00", is_end=False) == datetime(2026, 11, 13, 8)

    def test_z_suffix_is_utc(self):
        assert parse_date_bound("2026-11-13T08:00:00Z", is_end=False) == datetime(2026, 11, 13, 8)

    @pytest.mark.parametrize("value", ["yesterday", "2026-13-01", "2026-11-13T10:00:00 02:00"])
    def test_invalid_values_raise_with_parameter_name(self, value):
        with pytest.raises(ValueError, match="Invalid date_to"):
            parse_date_bound(value, is_end=True)


class TestBuildFilters:
    def test_no_filters(self):
        filters = build_filters()
        assert filters == MetricsFilters()
        assert filters.as_dict() == dict.fromkeys(
            ["date_from", "date_to", "feature", "provider", "model", "status"]
        )

    def test_same_day_is_valid(self):
        filters = build_filters(date_from="2026-11-13", date_to="2026-11-13")
        assert (filters.start, filters.end) == (datetime(2026, 11, 13), datetime(2026, 11, 14))

    def test_same_instant_is_valid(self):
        filters = build_filters(date_from="2026-11-13T10:00:00", date_to="2026-11-13T10:00:00")
        assert filters.start < filters.end

    def test_date_from_after_date_to(self):
        with pytest.raises(ValueError, match="date_from must be less than or equal to date_to"):
            build_filters(date_from="2026-11-14", date_to="2026-11-13")

    def test_keeps_raw_values(self):
        filters = build_filters(date_from="2026-11-13", feature="chat", status="error")
        assert filters.as_dict()["date_from"] == "2026-11-13"
        assert (filters.feature, filters.status) == ("chat", "error")


class TestParseBaseline:
    def test_valid(self):
        assert parse_baseline("anthropic:claude-haiku-5-5") == HAIKU

    def test_splits_on_first_colon(self):
        assert parse_baseline("local:model:v1") == ("local", "model:v1")

    @pytest.mark.parametrize("value", ["mistral", ":model", "provider:", " : "])
    def test_invalid(self, value):
        with pytest.raises(ValueError, match="baseline must be 'provider:model'"):
            parse_baseline(value)


class TestTimeseries:
    def test_bucket_start(self):
        moment = datetime(2026, 11, 13, 10, 41, 5, 7)
        assert bucket_start(moment, "hour") == datetime(2026, 11, 13, 10)
        assert bucket_start(moment, "day") == datetime(2026, 11, 13)

    def test_bucket_start_rejects_unknown(self):
        with pytest.raises(ValueError):
            bucket_start(T0, "week")

    def test_hour_and_day_buckets(self):
        rows = [
            row(created_at=datetime(2026, 11, 13, 10, 5), latency_ms=100),
            row(created_at=datetime(2026, 11, 13, 10, 40), latency_ms=300, status="error"),
            row(created_at=datetime(2026, 11, 13, 11, 10), latency_ms=200),
        ]

        hourly = build_timeseries(rows, "hour")
        assert [(p.bucket_start.hour, p.calls) for p in hourly] == [(10, 2), (11, 1)]
        assert hourly[0].errors == 1
        assert (hourly[0].latency_p50_ms, hourly[0].latency_p95_ms) == (100, 300)

        (daily,) = build_timeseries(rows, "day")
        assert daily.bucket_start == datetime(2026, 11, 13)
        assert daily.calls == 3
        assert daily.estimated_cost_usd == pytest.approx(0.003)

    def test_groups_split_within_bucket_and_sorted(self):
        rows = [row(*("feedback", *HAIKU)), row(), row(created_at=None)]
        points = build_timeseries(rows, "day")
        assert [(p.feature, p.provider) for p in points] == [("chat", "mistral"), ("feedback", "anthropic")]

    def test_empty(self):
        assert build_timeseries([], "hour") == []


class TestBuildReport:
    def test_metrics_and_deltas(self):
        # Given 20 calls each: Mistral p50 1000 ms / $0.001, Haiku p50 600 ms / $0.00025
        rows = (rows_for(MISTRAL, 20, latency_ms=1000, estimated_cost_usd=0.001, output_tokens=10)
                + rows_for(HAIKU, 20, latency_ms=600, estimated_cost_usd=0.00025, output_tokens=15))

        # When
        result = report(rows)

        # Then
        (chat,) = result.features
        assert chat.feature == "chat" and chat.baseline_present
        base, haiku = chat.rows
        assert base.is_baseline and base.deltas is None
        assert (base.provider, base.model) == MISTRAL
        assert haiku.latency_p50_ms == 600
        assert haiku.mean_cost_per_call_usd == pytest.approx(0.00025)
        assert haiku.cost_per_1000_calls_usd == pytest.approx(0.25)
        assert haiku.total_cost_usd == pytest.approx(0.005)
        assert haiku.deltas.latency_p50_pct == -40.0
        assert haiku.deltas.latency_mean_pct == -40.0
        assert haiku.deltas.latency_p95_pct == -40.0
        assert haiku.deltas.mean_cost_per_call_pct == -75.0
        assert haiku.deltas.mean_output_tokens_pct == 50.0
        assert haiku.deltas.mean_input_tokens_pct == 0.0
        assert haiku.deltas.error_rate_pp == 0.0
        assert haiku.warnings == [] and result.metadata.warnings == []

    def test_errors_refusals_and_success_only_latency(self):
        rows = (
            rows_for(HAIKU, 8, latency_ms=500, output_tokens=20)
            + rows_for(HAIKU, 2, latency_ms=50, output_tokens=0, status="error",
                       error_message="refusal: cyber")
            + rows_for(HAIKU, 1, latency_ms=30000, status="error",
                       error_message="invalid_json: Expecting value")
        )

        (r,) = report(rows).features[0].rows

        assert (r.calls, r.successful_calls, r.errors, r.refusals) == (11, 8, 3, 2)
        assert r.error_rate == pytest.approx(0.2727)
        assert r.latency_mean_ms == 500.0
        assert (r.latency_p50_ms, r.latency_p95_ms) == (500, 500)
        assert r.mean_output_tokens == 20.0
        # Cost includes failed calls that were priced
        assert r.priced_calls == 11
        assert r.total_cost_usd == pytest.approx(0.011)

    def test_only_failed_calls(self):
        (r,) = report(rows_for(MISTRAL, 3, status="error", error_message="boom")).features[0].rows
        assert r.error_rate == 1.0
        assert r.latency_mean_ms is None and r.latency_p50_ms is None
        assert r.mean_input_tokens is None and r.mean_output_tokens is None

    def test_error_rate_delta_in_percentage_points(self):
        rows = (rows_for(MISTRAL, 20)
                + rows_for(HAIKU, 19) + rows_for(HAIKU, 1, status="error", error_message="x"))
        haiku = report(rows).features[0].rows[1]
        assert haiku.deltas.error_rate_pp == 5.0

    def test_delta_none_when_baseline_value_zero_or_missing(self):
        rows = (rows_for(MISTRAL, 20, estimated_cost_usd=None, output_tokens=0)
                + rows_for(HAIKU, 20))
        haiku = report(rows).features[0].rows[1]
        assert haiku.deltas.mean_cost_per_call_pct is None
        assert haiku.deltas.mean_output_tokens_pct is None
        assert haiku.deltas.latency_p50_pct == 0.0

    def test_unpriced_row(self):
        rows = rows_for(MISTRAL, 20, estimated_cost_usd=None)
        result = report(rows)
        (r,) = result.features[0].rows
        assert r.mean_cost_per_call_usd is None and r.cost_per_1000_calls_usd is None
        assert r.total_cost_usd == 0.0
        assert r.warnings == [
            "mistral:mistral-large-latest (chat): 20 of 20 calls have no price entry; "
            "cost figures exclude them"
        ]

    def test_sample_size_warning(self):
        result = report(rows_for(MISTRAL, 20) + rows_for(HAIKU, 5))
        haiku = result.features[0].rows[1]
        expected = f"anthropic:claude-haiku-5-5 (chat): sample size 5 is below {MIN_SAMPLE_SIZE}"
        assert haiku.warnings == [expected]
        assert expected in result.metadata.warnings

    def test_custom_baseline_comes_first(self):
        rows = rows_for(MISTRAL, 20, latency_ms=1000) + rows_for(HAIKU, 20, latency_ms=500)
        base, mistral = report(rows, baseline="anthropic:claude-haiku-5-5").features[0].rows
        assert (base.provider, base.is_baseline) == ("anthropic", True)
        assert mistral.deltas.latency_p50_pct == 100.0

    def test_missing_baseline(self):
        rows = rows_for(MISTRAL, 20) + [
            row("feedback", *HAIKU) for _ in range(20)
        ] + [row("feedback", "anthropic", "claude-sonnet-5-5") for _ in range(20)]

        result = report(rows)

        chat, feedback = result.features
        assert chat.baseline_present and not feedback.baseline_present
        assert all(r.deltas is None for r in feedback.rows)
        assert [r.model for r in feedback.rows] == ["claude-haiku-5-5", "claude-sonnet-5-5"]
        assert result.metadata.warnings == [
            "Baseline mistral:mistral-large-latest has no calls for feature 'feedback'; "
            "no deltas computed"
        ]

    def test_partial_range_warning(self):
        # Mistral spans 10 days; Haiku appears only on the last day
        rows = (
            [row(created_at=datetime(2026, 11, day, 12)) for day in range(1, 11) for _ in range(2)]
            + rows_for(HAIKU, 20, created_at=datetime(2026, 11, 10, 12))
        )
        result = report(rows)
        base, haiku = result.features[0].rows
        assert base.warnings == []
        assert haiku.warnings == [
            "anthropic:claude-haiku-5-5 (chat): calls cover only 0% of the feature's date "
            "range (2026-11-10T12:00:00 to 2026-11-10T12:00:00)"
        ]
        assert result.features[0].first_call_at == datetime(2026, 11, 1, 12)
        assert result.features[0].last_call_at == datetime(2026, 11, 10, 12)

    def test_no_partial_range_warning_for_single_model(self):
        rows = rows_for(MISTRAL, 10, created_at=datetime(2026, 11, 1)) + rows_for(
            MISTRAL, 10, created_at=datetime(2026, 11, 10))
        assert report(rows).features[0].rows[0].warnings == []

    def test_status_filter_and_extra_warnings(self):
        result = report(rows_for(MISTRAL, 20), filters=build_filters(status="success"),
                        extra_warnings=["Price table could not be loaded"])
        assert result.metadata.warnings == [
            "Price table could not be loaded",
            "Status filter 'success' is applied; error rates reflect the filter",
        ]
        assert result.metadata.filters["status"] == "success"

    def test_metadata(self):
        rows = (rows_for(MISTRAL, 20, created_at=datetime(2026, 11, 1))
                + rows_for(HAIKU, 20, created_at=datetime(2026, 11, 9))
                + [row(model="unknown-model", created_at=None) for _ in range(20)])
        prices = {MISTRAL: price(*MISTRAL), HAIKU: price(*HAIKU, date(2026, 11, 12))}

        meta = report(rows, prices=prices).metadata

        assert meta.generated_at == GENERATED
        assert meta.baseline == "mistral:mistral-large-latest"
        assert (meta.covered_from, meta.covered_to) == (datetime(2026, 11, 1), datetime(2026, 11, 9))
        assert meta.min_sample_size == MIN_SAMPLE_SIZE
        assert meta.latency_basis == "successful calls"
        assert [(p.provider, p.model, p.checked_on) for p in meta.prices] == [
            ("anthropic", "claude-haiku-5-5", date(2026, 11, 12)),
            ("mistral", "mistral-large-latest", date(2026, 11, 13)),
        ]
        assert meta.notes == REPORT_NOTES
        assert any("eval harness (#231)" in note for note in meta.notes)

    def test_default_generated_at(self):
        result = build_report([], MetricsFilters(), "mistral:mistral-large-latest", {})
        assert result.metadata.generated_at.microsecond == 0
        assert result.metadata.generated_at.tzinfo is None

    def test_empty(self):
        result = report([])
        assert result.features == []
        assert result.metadata.covered_from is None and result.metadata.covered_to is None

    def test_invalid_baseline(self):
        with pytest.raises(ValueError):
            report([], baseline="mistral")


class TestRendering:
    def sample(self):
        rows = (rows_for(MISTRAL, 20, latency_ms=1000)
                + rows_for(HAIKU, 5, latency_ms=600, estimated_cost_usd=0.00025)
                + [row("feedback", "anthropic", "odd|model") for _ in range(20)])
        return report(rows, filters=build_filters(feature=None, date_from="2026-11-01"),
                      prices={MISTRAL: price(*MISTRAL)})

    def test_filename(self):
        result = self.sample()
        assert report_filename(result, "csv") == "llm-model-report-20261114-0718.csv"
        assert report_filename(result, "md") == "llm-model-report-20261114-0718.md"

    def test_markdown(self):
        md = render_report_markdown(self.sample())

        assert md.startswith("# LLM model comparison report\n")
        assert "- **Generated**: 2026-11-14 07:18:05 UTC" in md
        assert "- **Filters**: date_from=2026-11-01" in md
        for heading in ("## Notes", "## Warnings", "## Prices used", "## Feature: chat",
                        "## Feature: feedback", "### Compared with baseline"):
            assert heading in md
        assert "| mistral:mistral-large-latest (baseline) | 20 | 0.0% | 0 | 1000.0 / 1000 / 1000 |" in md
        assert "| anthropic:claude-haiku-5-5 | -40.0% | -40.0% | -40.0% | +0.0% | +0.0% | -75.0% | +0.0 pp |" in md
        assert "sample size 5 is below 20" in md
        assert "- mistral:mistral-large-latest: checked 2026-11-13, source https://example.com/pricing" in md
        assert "anthropic:odd\\|model" in md
        assert "Baseline mistral:mistral-large-latest has no calls for this feature." in md
        assert "| 0.001 | 1 | 0.02 |" in md  # cost per call, per 1,000, total

    def test_markdown_baseline_only_and_empty(self):
        md = render_report_markdown(report(rows_for(MISTRAL, 20, estimated_cost_usd=None)))
        assert "Only the baseline model has calls for this feature." in md
        assert "n/a" in md

        empty = render_report_markdown(report([]))
        assert "- **Filters**: none" in empty
        assert "No calls match the filters." in empty
        assert "## Warnings\n\nNone" in empty
        assert "## Prices used\n\nNone" in empty

    def test_csv(self):
        text = render_report_csv(self.sample())
        records = list(csv.DictReader(io.StringIO(text)))

        assert list(records[0].keys())[: len(CSV_COLUMNS)] == CSV_COLUMNS
        assert list(records[0].keys())[-1] == "warnings"
        assert [(r["feature"], r["model"]) for r in records] == [
            ("chat", "mistral-large-latest"), ("chat", "claude-haiku-5-5"), ("feedback", "odd|model"),
        ]
        base, haiku, feedback = records
        assert base["is_baseline"] == "True" and base["delta_latency_p50_pct"] == ""
        assert haiku["delta_latency_p50_pct"] == "-40.0"
        assert haiku["delta_mean_cost_per_call_pct"] == "-75.0"
        assert haiku["warnings"] == "anthropic:claude-haiku-5-5 (chat): sample size 5 is below 20"
        assert base["first_call_at"] == "2026-11-13T10:00:00"
        assert feedback["delta_error_rate_pp"] == ""

    def test_csv_empty_has_header_only(self):
        text = render_report_csv(report([]))
        assert text.count("\n") == 1 and text.startswith("feature,provider,model,")


class TestLoadPriceDocument:
    def test_matches_price_table(self):
        document = load_price_document()
        assert document.currency == "USD"
        assert {(m.provider, m.model) for m in document.models} == set(load_price_table())

    def test_duplicate_entries_rejected(self, tmp_path):
        entry = {"provider": "p", "model": "m", "input_per_mtok": 1, "output_per_mtok": 1,
                 "cache_read_per_mtok": 0, "checked_on": "2026-11-13",
                 "source": "https://example.com"}
        path = tmp_path / "prices.json"
        path.write_text(json.dumps({"models": [entry, entry]}), encoding="utf-8")
        with pytest.raises(ValueError, match="Duplicate price entry"):
            load_price_document(str(path))
