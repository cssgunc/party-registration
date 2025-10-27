"""
Reads configuration from environment variables or .env file.
"""

from pydantic_settings import BaseSettings


class Config(BaseSettings):
    POSTGRES_DATABASE: str = "ocsl"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "admin"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    HOST: str = "localhost"
    PARTY_SEARCH_RADIUS_MILES: float = 3.0


env = Config()