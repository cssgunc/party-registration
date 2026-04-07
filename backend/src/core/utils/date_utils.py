"""Date utility functions for the application."""

from datetime import UTC, datetime


def is_same_academic_year(date1: datetime | None, date2: datetime | None = None) -> bool:
    """
    Check if two dates are in the same academic year (August 1 - July 31).

    Args:
        date1: First date to compare
        date2: Second date to compare (defaults to current datetime if None)

    Returns:
        True if both dates are in the same academic year, False otherwise
    """
    if date1 is None:
        return False

    if date2 is None:
        date2 = datetime.now(UTC)

    # Ensure both dates are timezone-aware
    if date1.tzinfo is None:
        date1 = date1.replace(tzinfo=UTC)
    if date2.tzinfo is None:
        date2 = date2.replace(tzinfo=UTC)

    # Determine academic year for each date
    # Academic year starts August 1
    year1 = date1.year if date1.month >= 8 else date1.year - 1
    year2 = date2.year if date2.month >= 8 else date2.year - 1

    return year1 == year2
