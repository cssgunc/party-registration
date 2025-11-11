from datetime import datetime

from fastapi import APIRouter, Depends, Query
from src.core.authentication import authenticate_admin, authenticate_police_or_admin
from src.core.exceptions import BadRequestException
from src.modules.location.location_service import LocationService

from .party_model import PaginatedPartiesResponse, Party
from .party_service import PartyService

party_router = APIRouter(prefix="/api/parties", tags=["parties"])


@party_router.get("/")
async def list_parties(
    page_number: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int | None = Query(
        None, ge=1, le=100, description="Items per page (default: all)"
    ),
    party_service: PartyService = Depends(),
    _=Depends(authenticate_admin),
) -> PaginatedPartiesResponse:
    """
    Returns all party registrations in the database with optional pagination.

    Query Parameters:
    - page_number: The page number to retrieve (1-indexed)
    - page_size: Number of items per page (max 100, default: returns all parties)

    Returns:
    - parties: List of party registrations
    - total_records: Total number of records in the database
    - page_size: Requested page size (or total_records if not specified)
    - page_number: Requested page number
    - total_pages: Total number of pages based on page size
    """
    # Get total count first
    total_records = await party_service.get_party_count()

    # If page_size is None, return all parties
    if page_size is None:
        parties = await party_service.get_parties(skip=0, limit=None)
        return PaginatedPartiesResponse(
            parties=parties,
            total_records=total_records,
            page_size=total_records,
            page_number=1,
            total_pages=1,
        )

    # Calculate skip and limit for pagination
    skip = (page_number - 1) * page_size

    # Get parties with pagination
    parties = await party_service.get_parties(skip=skip, limit=page_size)

    # Calculate total pages (ceiling division)
    total_pages = (
        (total_records + page_size - 1) // page_size if total_records > 0 else 0
    )

    return PaginatedPartiesResponse(
        parties=parties,
        total_records=total_records,
        page_size=page_size,
        page_number=page_number,
        total_pages=total_pages,
    )


@party_router.get("/nearby")
async def get_parties_nearby(
    place_id: str = Query(..., description="Google Maps place ID"),
    start_date: str = Query(..., description="Start date (YYYY-MM-DD format)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD format)"),
    party_service: PartyService = Depends(),
    location_service: LocationService = Depends(),
    _=Depends(authenticate_police_or_admin),
) -> list[Party]:
    """
    Returns parties within a radius of a location specified by Google Maps place ID,
    filtered by date range.

    Query Parameters:
    - place_id: Google Maps place ID from autocomplete selection
    - start_date: Start date for the search range (YYYY-MM-DD format)
    - end_date: End date for the search range (YYYY-MM-DD format)

    Returns:
    - List of parties within the search radius and date range

    Raises:
    - 400: If place ID is invalid or dates are in wrong format
    - 404: If place ID is not found
    - 403: If user is not a police officer or admin
    """
    # Parse date strings to datetime objects
    try:
        start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
        end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
        # Set end_datetime to end of day (23:59:59)
        end_datetime = end_datetime.replace(hour=23, minute=59, second=59)
    except ValueError as e:
        raise BadRequestException(f"Invalid date format. Expected YYYY-MM-DD: {str(e)}")

    # Get location coordinates from place ID
    location_data = await location_service.get_place_details(place_id)

    # Perform proximity search with date range
    parties = await party_service.get_parties_by_radius_and_date_range(
        latitude=location_data.latitude,
        longitude=location_data.longitude,
        start_date=start_datetime,
        end_date=end_datetime,
    )

    return parties


@party_router.get("/{party_id}")
async def get_party(
    party_id: int,
    party_service: PartyService = Depends(),
    _=Depends(authenticate_admin),
) -> Party:
    """
    Returns a party registration by ID.

    Parameters:
    - party_id: The ID of the party to retrieve

    Returns:
    - Party registration with the specified ID

    Raises:
    - 404: If party with the specified ID does not exist
    """
    return await party_service.get_party_by_id(party_id)


@party_router.delete("/{party_id}")
async def delete_party(
    party_id: int,
    party_service: PartyService = Depends(),
    _=Depends(authenticate_admin),
) -> Party:
    """
    Deletes a party registration by ID.

    Parameters:
    - party_id: The ID of the party to delete

    Returns:
    - The deleted party registration

    Raises:
    - 404: If party with the specified ID does not exist
    """
    return await party_service.delete_party(party_id)
