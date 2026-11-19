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
    "LLM_TIMEOUT_SECONDS",
    "CLAUDE_CHAT_EFFORT",
    "CLAUDE_FEEDBACK_EFFORT",
    "LLM_PRICING_FILE",
    "STUDY_COACH_ENABLED",
    "STUDY_COACH_MODEL",
    "CLAUDE_STUDY_COACH_EFFORT",
    "STUDY_COACH_MAX_ITERATIONS",
]


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    """Isolate each test from LLM variables in the process environment."""
    for name in LLM_ENV_VARS:
        monkeypatch.delenv(name, raising=False)


def make_settings(**overrides) -> Settings:
    """Build Settings without reading .env."""
    return Settings(_env_file=None, **overrides)


#: Explicit routing that opts both features back into Mistral Large.
ALL_MISTRAL = {
    "CHAT_PROVIDER": "mistral",
    "CHAT_MODEL": "mistral-large-latest",
    "FEEDBACK_PROVIDER": "mistral",
    "FEEDBACK_MODEL": "mistral-large-latest",
}


class TestDefaults:
    def test_defaults_use_claude_sonnet_for_both_features(self):
        # Given only an Anthropic key / When settings load
        settings = make_settings(ANTHROPIC_API_KEY="key")

        # Then both features use Claude Sonnet 5.5 (issue #232 decision record)
        # and no Claude effort overrides are set
        assert settings.CHAT_PROVIDER == "anthropic"
        assert settings.CHAT_MODEL == "claude-sonnet-5-5"
        assert settings.FEEDBACK_PROVIDER == "anthropic"
        assert settings.FEEDBACK_MODEL == "claude-sonnet-5-5"
        assert settings.CLAUDE_CHAT_EFFORT is None
        assert settings.CLAUDE_FEEDBACK_EFFORT is None
        assert settings.LLM_TIMEOUT_SECONDS == 120
        assert settings.LLM_PRICING_FILE == "data/llm_pricing.json"
        assert settings.MISTRAL_API_KEY is None

    def test_default_config_requires_anthropic_key(self):
        with pytest.raises(ValidationError, match="ANTHROPIC_API_KEY"):
            make_settings(ANTHROPIC_API_KEY=None)

    def test_default_config_does_not_require_mistral_key(self):
        settings = make_settings(ANTHROPIC_API_KEY="key", MISTRAL_API_KEY=None)
        assert settings.MISTRAL_API_KEY is None

    def test_empty_anthropic_key_counts_as_missing_with_defaults(self):
        with pytest.raises(ValidationError, match="ANTHROPIC_API_KEY"):
            make_settings(ANTHROPIC_API_KEY="")


class TestMistralOptIn:
    def test_all_mistral_config_needs_no_anthropic_key(self):
        # Given explicit Mistral routing and only a Mistral key
        settings = make_settings(MISTRAL_API_KEY="key", **ALL_MISTRAL)

        # Then both features use Mistral Large
        assert settings.CHAT_PROVIDER == "mistral"
        assert settings.FEEDBACK_MODEL == "mistral-large-latest"
        assert settings.ANTHROPIC_API_KEY is None

    def test_all_mistral_config_requires_mistral_key(self):
        with pytest.raises(ValidationError, match="MISTRAL_API_KEY"):
            make_settings(MISTRAL_API_KEY=None, **ALL_MISTRAL)

    def test_empty_mistral_key_counts_as_missing(self):
        with pytest.raises(ValidationError, match="MISTRAL_API_KEY"):
            make_settings(MISTRAL_API_KEY="", **ALL_MISTRAL)

    def test_environment_values_override_the_defaults(self, monkeypatch):
        # Given a .env-style environment that pins Mistral (e.g. an older .env.example)
        monkeypatch.setenv("MISTRAL_API_KEY", "m")
        for name, value in ALL_MISTRAL.items():
            monkeypatch.setenv(name, value)

        # When settings load / Then the explicit values win over the Claude defaults
        settings = make_settings()
        assert settings.CHAT_PROVIDER == "mistral"
        assert settings.FEEDBACK_PROVIDER == "mistral"


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
            CHAT_PROVIDER="mistral",
            CHAT_MODEL="mistral-large-latest",
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
        monkeypatch.setenv("LLM_TIMEOUT_SECONDS", "75")

        settings = make_settings()

        assert settings.CHAT_MODEL == "claude-haiku-5-5"
        assert settings.CLAUDE_FEEDBACK_EFFORT == "high"
        assert settings.LLM_TIMEOUT_SECONDS == 75

    @pytest.mark.parametrize("value", [0, -1])
    def test_timeout_must_be_positive(self, value):
        with pytest.raises(ValidationError):
            make_settings(ANTHROPIC_API_KEY="a", LLM_TIMEOUT_SECONDS=value)


class TestEffortValidation:
    @pytest.mark.parametrize("effort", ["low", "medium", "high", "xhigh", "max"])
    def test_valid_effort_values(self, effort):
        settings = make_settings(ANTHROPIC_API_KEY="key", CLAUDE_CHAT_EFFORT=effort)
        assert settings.CLAUDE_CHAT_EFFORT == effort

    def test_invalid_effort_rejected(self):
        with pytest.raises(ValidationError):
            make_settings(ANTHROPIC_API_KEY="key", CLAUDE_FEEDBACK_EFFORT="extreme")


class TestStudyCoachSettings:
    """Issue #270: study-coach settings."""

    def test_defaults(self):
        settings = make_settings(ANTHROPIC_API_KEY="a")
        assert settings.STUDY_COACH_ENABLED is True
        assert settings.STUDY_COACH_MODEL == "claude-sonnet-5-5"
        assert settings.CLAUDE_STUDY_COACH_EFFORT is None
        assert settings.STUDY_COACH_MAX_ITERATIONS == 8

    @pytest.mark.parametrize("value", [1, 21])
    def test_iteration_cap_bounds(self, value):
        with pytest.raises(ValidationError):
            make_settings(ANTHROPIC_API_KEY="a", STUDY_COACH_MAX_ITERATIONS=value)

    def test_invalid_effort_rejected(self):
        with pytest.raises(ValidationError):
            make_settings(ANTHROPIC_API_KEY="a", CLAUDE_STUDY_COACH_EFFORT="extreme")

    def test_mistral_only_setup_starts_without_anthropic_key(self):
        """The study coach is left out of the startup key check."""
        settings = make_settings(MISTRAL_API_KEY="m", **ALL_MISTRAL)
        assert settings.STUDY_COACH_ENABLED is True
        assert settings.ANTHROPIC_API_KEY is None
