"""Application settings loaded from environment variables and ``.env``.

LLM provider and model are chosen per feature (issue #228). The defaults follow the
model-choice decision record (issue #232, ``docs/decisions/001-model-choice.md``): both
chat and feedback run on Claude Sonnet 5.5. Mistral (``mistral-large-latest``) can be
selected per feature.
"""

from typing import Literal, Optional

from pydantic import model_validator
from pydantic_settings import BaseSettings

ProviderId = Literal["mistral", "anthropic"]
ClaudeEffort = Literal["low", "medium", "high", "xhigh", "max"]

# Environment variable that holds the API key for each provider.
PROVIDER_KEY_SETTINGS: dict[str, str] = {
    "mistral": "MISTRAL_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
}


class Settings(BaseSettings):
    """Runtime configuration for the French Language Coach backend."""

    MISTRAL_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    DATABASE_URL: str = "sqlite+aiosqlite:///./french_coach.db"

    # Per-feature LLM routing (issue #228). Defaults from the decision record (issue #232).
    CHAT_PROVIDER: ProviderId = "anthropic"
    CHAT_MODEL: str = "claude-sonnet-5-5"
    FEEDBACK_PROVIDER: ProviderId = "anthropic"
    FEEDBACK_MODEL: str = "claude-sonnet-5-5"

    # Optional Claude effort overrides; when unset the provider's defaults apply
    # (chat: low, feedback: medium).
    CLAUDE_CHAT_EFFORT: Optional[ClaudeEffort] = None
    CLAUDE_FEEDBACK_EFFORT: Optional[ClaudeEffort] = None

    # Price table used to estimate the cost of each LLM call
    LLM_PRICING_FILE: str = "data/llm_pricing.json"

    # French feedback rubric appended to the feedback prompt (issue #269). Off restores
    # the bare prompt exactly; the file is the canonical rubric shared with the
    # french-feedback-rubric Claude Code skill.
    FEEDBACK_RUBRIC: bool = True
    FEEDBACK_RUBRIC_FILE: str = "data/feedback_rubric.md"

    class Config:
        env_file = ".env"

    @model_validator(mode="after")
    def check_provider_keys(self) -> "Settings":
        """Require an API key for every provider that a feature is configured to use.

        An empty string counts as missing, so a blank ``ANTHROPIC_API_KEY=`` copied from
        ``.env.example`` does not satisfy the check.
        """
        for provider in sorted({self.CHAT_PROVIDER, self.FEEDBACK_PROVIDER}):
            key_name = PROVIDER_KEY_SETTINGS[provider]
            if not getattr(self, key_name):
                raise ValueError(
                    f"{key_name} must be set because a feature is configured to use "
                    f"the '{provider}' provider"
                )
        return self


settings = Settings()
