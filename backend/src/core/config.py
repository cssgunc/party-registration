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


env = Config()
