"""Date utility functions for the application."""

from datetime import UTC, datetime, timedelta

from src.core.config import env


def current_academic_year_start(date: datetime | None = None) -> datetime:
    """Return the start of the academic year for the given date, defaulting to now.

    The switch month/day is configured via ACADEMIC_YEAR_SWITCH_DATE.
    """
    d = date if date is not None else datetime.now(UTC)
    if d.tzinfo is None:
        d = d.replace(tzinfo=UTC)
    month = env.academic_year_switch_month
    day = env.academic_year_switch_day
    year = d.year if (d.month, d.day) >= (month, day) else d.year - 1
    return datetime(year, month, day, tzinfo=UTC)


def is_same_academic_year(date1: datetime | None, date2: datetime | None = None) -> bool:
    """Return True if date1 and date2 fall in the same academic year.

    date2 defaults to now (UTC) when omitted. Returns False if date1 is None.
    """
    if date1 is None:
        return False

    return current_academic_year_start(date1) == current_academic_year_start(date2)


def business_days_ahead(target_date: datetime) -> int:
    """Number of business days between today (UTC) and target_date."""
    current_date = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    if target_date.tzinfo is None:
        target_date_only = target_date.replace(
            hour=0, minute=0, second=0, microsecond=0, tzinfo=UTC
        )
    else:
        target_date_only = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    business_days = 0
    current = current_date
    while current < target_date_only:
        if current.weekday() < 5:
            business_days += 1
        current += timedelta(days=1)
    return business_days


def hours_ahead(target_datetime: datetime) -> float:
    """Hours between now (UTC) and target_datetime."""
    now = datetime.now(UTC)
    if target_datetime.tzinfo is None:
        target_datetime = target_datetime.replace(tzinfo=UTC)
    return (target_datetime - now).total_seconds() / 3600
