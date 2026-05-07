from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MISTRAL_API_KEY: str
    DATABASE_URL: str = "sqlite+aiosqlite:///./french_coach.db"

    class Config:
        env_file = ".env"


settings = Settings()
