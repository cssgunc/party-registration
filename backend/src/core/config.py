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

    MSSQL_DATABASE: str = "ocsl"
    MSSQL_USER: str = "sa"
    MSSQL_PASSWORD: str = "YourStrong!Passw0rd"
    MSSQL_HOST: str = "db"
    MSSQL_PORT: int = 1433
    MSSQL_DRIVER: str = "ODBC Driver 18 for SQL Server"
    MSSQL_TRUST_SERVER_CERTIFICATE: str = "yes"
    HOST: str = "localhost"
    PARTY_SEARCH_RADIUS_MILES: float = 0.25
    GOOGLE_MAPS_API_KEY: str


env = Config()  # pyright: ignore[reportCallIssue]
