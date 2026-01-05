"""Geo utility functions for testing."""

from src.core.config import env


def get_lat_offset_for_miles(miles: float) -> float:
    """
    Convert miles to approximate latitude offset.

    At most latitudes, 1 degree of latitude ≈ 69 miles.
    This is an approximation suitable for testing.

    Args:
        miles: Distance in miles

    Returns:
        Latitude offset in degrees
    """
    return miles / 69.0


def get_lat_offset_within_radius() -> float:
    """Get a latitude offset that is within the search radius (~60% of max)."""
    return get_lat_offset_for_miles(env.PARTY_SEARCH_RADIUS_MILES * 0.6)


def get_lat_offset_outside_radius() -> float:
    """Get a latitude offset that is outside the search radius (~120% of max)."""
    return get_lat_offset_for_miles(env.PARTY_SEARCH_RADIUS_MILES * 1.2)
