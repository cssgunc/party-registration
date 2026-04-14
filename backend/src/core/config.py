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

    # Database configuration
    MSSQL_DATABASE: str = "ocsl"
    MSSQL_USER: str = "sa"
    MSSQL_PASSWORD: str = "YourStrong!Passw0rd"
    MSSQL_HOST: str = "db"
    MSSQL_PORT: int = 1433
    MSSQL_DRIVER: str = "ODBC Driver 18 for SQL Server"
    MSSQL_TRUST_SERVER_CERTIFICATE: str = "yes"

    # Frontend configuration
    FRONTEND_BASE_URL: str = "http://localhost:3000"

    # Google Maps
    GOOGLE_MAPS_API_KEY: str

    # JWT Configuration
    JWT_SECRET_KEY: str
    REFRESH_TOKEN_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Internal API Secret
    INTERNAL_API_SECRET: str

    # Email / SMTP
    SMTP_HOST: str = "mailpit"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = False
    EMAIL_FROM: str = "ocsl-no-reply@unc.edu"

    # App Configuration
    PARTY_SEARCH_RADIUS_MILES: float = 0.25
    CHPD_EMAIL_DOMAIN: str = "chapelhillnc.gov"
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24


env = Config()  # pyright: ignore[reportCallIssue]
