"""Application settings loaded from environment variables and ``.env``.

LLM provider and model are chosen per feature (issue #228). The defaults reproduce the
original behaviour: both chat and feedback run on Mistral ``mistral-large-latest``.
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

    # Per-feature LLM routing (issue #228)
    CHAT_PROVIDER: ProviderId = "mistral"
    CHAT_MODEL: str = "mistral-large-latest"
    FEEDBACK_PROVIDER: ProviderId = "mistral"
    FEEDBACK_MODEL: str = "mistral-large-latest"

    # Optional Claude effort overrides; when unset the provider's defaults apply
    # (chat: low, feedback: medium).
    CLAUDE_CHAT_EFFORT: Optional[ClaudeEffort] = None
    CLAUDE_FEEDBACK_EFFORT: Optional[ClaudeEffort] = None

    # Price table used to estimate the cost of each LLM call
    LLM_PRICING_FILE: str = "data/llm_pricing.json"

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
