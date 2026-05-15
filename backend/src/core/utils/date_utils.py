"""Date utility functions for the application."""

from datetime import UTC, datetime, timedelta


def current_academic_year_start(date: datetime | None = None) -> datetime:
    """Return the start of the academic year (August 1) for the given date, defaulting to now."""
    d = date if date is not None else datetime.now(UTC)
    if d.tzinfo is None:
        d = d.replace(tzinfo=UTC)
    year = d.year if d.month >= 8 else d.year - 1
    return datetime(year, 8, 1, tzinfo=UTC)


def is_same_academic_year(date1: datetime | None, date2: datetime | None = None) -> bool:
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
