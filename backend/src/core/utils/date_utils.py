"""Date utility functions for the application."""

from datetime import UTC, datetime


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
