"""
Reads configuration from environment variables or .env file.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    POSTGRES_DATABASE: str = "ocsl"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "admin"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    HOST: str = "localhost"
    PARTY_SEARCH_RADIUS_MILES: float = 0.25
    GOOGLE_MAPS_API_KEY: str


env = Config()  # pyright: ignore[reportCallIssue]