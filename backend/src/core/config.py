"""
Reads configuration from environment variables or .env file.
"""

import re
from datetime import date
from pathlib import Path

from pydantic import EmailStr, Field, HttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database configuration
    MYSQL_DATABASE: str = "ocsl"
    MYSQL_USER: str
    MYSQL_PASSWORD: str
    MYSQL_HOST: str
    MYSQL_PORT: int = 3306

    # Frontend configuration
    FRONTEND_BASE_URL: HttpUrl
    API_BASE_URL: HttpUrl

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
    SMTP_HOST: str
    SMTP_PORT: int
    SMTP_TLS: bool
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: EmailStr = "ocsl-no-reply@unc.edu"
    OCSL_WEBSITE_URL: HttpUrl = HttpUrl("https://offcampus.unc.edu/unc-party-registration")

    # Logging
    SQLALCHEMY_ECHO: bool = False

    # App Configuration
    # These four use NEXT_PUBLIC_ names so the single env var is shared with the
    # frontend build — no duplicate entries needed in .env files.
    PARTY_SEARCH_RADIUS_MILES: float = Field(
        default=0.1, validation_alias="NEXT_PUBLIC_PARTY_SEARCH_RADIUS_MILES"
    )
    CHPD_EMAIL_DOMAIN: str = Field(
        default="chapelhillnc.gov", validation_alias="NEXT_PUBLIC_CHPD_EMAIL_DOMAIN"
    )
    CONTACT_EMAIL: EmailStr = Field(
        default="offcampus@unc.edu", validation_alias="NEXT_PUBLIC_CONTACT_EMAIL"
    )
    ACADEMIC_YEAR_SWITCH_DATE: str = Field(
        default="08-01", validation_alias="NEXT_PUBLIC_ACADEMIC_YEAR_SWITCH_DATE"
    )
    PARTY_MIN_LEAD_HOURS: int = Field(
        default=24, validation_alias="NEXT_PUBLIC_PARTY_MIN_LEAD_HOURS"
    )
    PARTY_MAX_LEAD_DAYS: int = Field(default=30, validation_alias="NEXT_PUBLIC_PARTY_MAX_LEAD_DAYS")
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    INVITE_TOKEN_EXPIRY_HOURS: int = 48
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = Field(
        default=1, validation_alias="NEXT_PUBLIC_PASSWORD_RESET_TOKEN_EXPIRE_HOURS"
    )

    @field_validator("ACADEMIC_YEAR_SWITCH_DATE")
    @classmethod
    def _validate_academic_year_switch_date(cls, v: str) -> str:
        if not re.fullmatch(r"\d{2}-\d{2}", v):
            raise ValueError("ACADEMIC_YEAR_SWITCH_DATE must be MM-DD format (e.g. 08-01)")
        month, day = (int(part) for part in v.split("-"))
        try:
            # Use a non-leap year so Feb 29 is rejected — date must be valid every year.
            date(2001, month, day)
        except ValueError as e:
            raise ValueError(f"ACADEMIC_YEAR_SWITCH_DATE is not a valid calendar date: {e}") from e
        return v

    @property
    def academic_year_switch_month(self) -> int:
        return int(self.ACADEMIC_YEAR_SWITCH_DATE.split("-")[0])

    @property
    def academic_year_switch_day(self) -> int:
        return int(self.ACADEMIC_YEAR_SWITCH_DATE.split("-")[1])


env = Config()  # pyright: ignore[reportCallIssue]
