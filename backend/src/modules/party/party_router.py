from fastapi import APIRouter, Depends, Query
from src.core.authentication import authenticate_user
from .party_model import Party, PaginatedPartiesResponse
from .party_service import PartyService

party_router = APIRouter(prefix="/api/parties", tags=["parties"])


@party_router.get("/")
async def list_parties(
    page_number: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    party_service: PartyService = Depends(),
    _=Depends(authenticate_user)
) -> PaginatedPartiesResponse:
    """
    Returns all party registrations in the database with pagination.

    Query Parameters:
    - page_number: The page number to retrieve (1-indexed)
    - page_size: Number of items per page (max 100)

    Returns:
    - parties: List of party registrations
    - total_records: Total number of records in the database
    - page_size: Requested page size
    - page_number: Requested page number
    - total_pages: Total number of pages based on page size
    """
    # Calculate skip and limit for the service
    skip = (page_number - 1) * page_size

    # Get parties and total count
    parties = await party_service.get_parties(skip=skip, limit=page_size)
    total_records = await party_service.get_party_count()

    # Calculate total pages (ceiling division)
    total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 0

    return PaginatedPartiesResponse(
        parties=parties,
        total_records=total_records,
        page_size=page_size,
        page_number=page_number,
        total_pages=total_pages
    )


@party_router.get("/{party_id}")
async def get_party(
    party_id: int,
    party_service: PartyService = Depends(),
    _=Depends(authenticate_user)
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
    _=Depends(authenticate_user)
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
