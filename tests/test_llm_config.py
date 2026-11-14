"""Tests for issue #228: per-feature LLM provider configuration."""

import pytest
from pydantic import ValidationError

from config import Settings

LLM_ENV_VARS = [
    "MISTRAL_API_KEY",
    "ANTHROPIC_API_KEY",
    "CHAT_PROVIDER",
    "CHAT_MODEL",
    "FEEDBACK_PROVIDER",
    "FEEDBACK_MODEL",
    "CLAUDE_CHAT_EFFORT",
    "CLAUDE_FEEDBACK_EFFORT",
    "LLM_PRICING_FILE",
]


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    """Isolate each test from LLM variables in the process environment."""
    for name in LLM_ENV_VARS:
        monkeypatch.delenv(name, raising=False)


def make_settings(**overrides) -> Settings:
    """Build Settings without reading .env."""
    return Settings(_env_file=None, **overrides)


class TestDefaults:
    def test_defaults_reproduce_original_behaviour(self):
        # Given only a Mistral key / When settings load
        settings = make_settings(MISTRAL_API_KEY="key")

        # Then both features use Mistral Large and no Claude overrides are set
        assert settings.CHAT_PROVIDER == "mistral"
        assert settings.CHAT_MODEL == "mistral-large-latest"
        assert settings.FEEDBACK_PROVIDER == "mistral"
        assert settings.FEEDBACK_MODEL == "mistral-large-latest"
        assert settings.CLAUDE_CHAT_EFFORT is None
        assert settings.CLAUDE_FEEDBACK_EFFORT is None
        assert settings.LLM_PRICING_FILE == "data/llm_pricing.json"
        assert settings.ANTHROPIC_API_KEY is None

    def test_default_config_still_requires_mistral_key(self):
        with pytest.raises(ValidationError, match="MISTRAL_API_KEY"):
            make_settings(MISTRAL_API_KEY=None)

    def test_empty_mistral_key_counts_as_missing(self):
        with pytest.raises(ValidationError, match="MISTRAL_API_KEY"):
            make_settings(MISTRAL_API_KEY="")


class TestProviderValidation:
    def test_unknown_provider_rejected(self):
        with pytest.raises(ValidationError):
            make_settings(MISTRAL_API_KEY="key", CHAT_PROVIDER="openai")

    def test_anthropic_feedback_requires_anthropic_key(self):
        with pytest.raises(ValidationError, match="ANTHROPIC_API_KEY"):
            make_settings(MISTRAL_API_KEY="key", FEEDBACK_PROVIDER="anthropic")

    def test_empty_anthropic_key_counts_as_missing(self):
        with pytest.raises(ValidationError, match="ANTHROPIC_API_KEY"):
            make_settings(
                MISTRAL_API_KEY="key", FEEDBACK_PROVIDER="anthropic", ANTHROPIC_API_KEY=""
            )

    def test_mixed_providers_need_both_keys(self):
        settings = make_settings(
            MISTRAL_API_KEY="m",
            ANTHROPIC_API_KEY="a",
            FEEDBACK_PROVIDER="anthropic",
            FEEDBACK_MODEL="claude-sonnet-5-5",
        )
        assert settings.CHAT_PROVIDER == "mistral"
        assert settings.FEEDBACK_PROVIDER == "anthropic"

    def test_claude_only_config_does_not_need_mistral_key(self):
        settings = make_settings(
            ANTHROPIC_API_KEY="a",
            CHAT_PROVIDER="anthropic",
            CHAT_MODEL="claude-haiku-5-5",
            FEEDBACK_PROVIDER="anthropic",
            FEEDBACK_MODEL="claude-sonnet-5-5",
        )
        assert settings.MISTRAL_API_KEY is None

    def test_values_read_from_environment(self, monkeypatch):
        monkeypatch.setenv("ANTHROPIC_API_KEY", "a")
        monkeypatch.setenv("CHAT_PROVIDER", "anthropic")
        monkeypatch.setenv("CHAT_MODEL", "claude-haiku-5-5")
        monkeypatch.setenv("FEEDBACK_PROVIDER", "anthropic")
        monkeypatch.setenv("CLAUDE_FEEDBACK_EFFORT", "high")

        settings = make_settings()

        assert settings.CHAT_MODEL == "claude-haiku-5-5"
        assert settings.CLAUDE_FEEDBACK_EFFORT == "high"


class TestEffortValidation:
    @pytest.mark.parametrize("effort", ["low", "medium", "high", "xhigh", "max"])
    def test_valid_effort_values(self, effort):
        settings = make_settings(MISTRAL_API_KEY="key", CLAUDE_CHAT_EFFORT=effort)
        assert settings.CLAUDE_CHAT_EFFORT == effort

    def test_invalid_effort_rejected(self):
        with pytest.raises(ValidationError):
            make_settings(MISTRAL_API_KEY="key", CLAUDE_FEEDBACK_EFFORT="extreme")
