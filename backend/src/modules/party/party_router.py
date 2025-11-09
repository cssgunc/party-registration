from fastapi import APIRouter, Depends, Query, Body
from src.core.authentication import authenticate_admin, authenticate_user
from src.modules.account.account_model import Account, AccountRole
from .party_model import Party, PaginatedPartiesResponse, StudentCreatePartyDTO, AdminCreatePartyDTO
from .party_service import PartyService

party_router = APIRouter(prefix="/api/parties", tags=["parties"])


@party_router.post("/")
async def create_party(
    party_data: dict = Body(...),
    party_service: PartyService = Depends(),
    user: Account = Depends(authenticate_user)
) -> Party:
    """
    Create a new party registration.

    - Students: provide party_datetime, place_id, and contact_two_id (contact_one is auto-filled)
    - Admins: provide party_datetime, place_id, contact_one_id, and contact_two_id

    The location will be automatically created if it doesn't exist in the database.
    """
    if user.role == AccountRole.STUDENT:
        # Parse as StudentCreatePartyDTO
        dto = StudentCreatePartyDTO(**party_data)
        return await party_service.create_party_from_student_dto(dto, user.id)
    elif user.role == AccountRole.ADMIN:
        # Parse as AdminCreatePartyDTO
        dto = AdminCreatePartyDTO(**party_data)
        return await party_service.create_party_from_admin_dto(dto)
    else:
        from src.core.exceptions import ForbiddenException
        raise ForbiddenException(detail="Only students and admins can create parties")


@party_router.get("/")
async def list_parties(
    page_number: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int | None = Query(None, ge=1, le=100, description="Items per page (default: all)"),
    party_service: PartyService = Depends(),
    _=Depends(authenticate_admin)
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
            total_pages=1
        )

    # Calculate skip and limit for pagination
    skip = (page_number - 1) * page_size

    # Get parties with pagination
    parties = await party_service.get_parties(skip=skip, limit=page_size)

    # Calculate total pages (ceiling division)
    total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 0

    return PaginatedPartiesResponse(
        parties=parties,
        total_records=total_records,
        page_size=page_size,
        page_number=page_number,
        total_pages=total_pages
    )


@party_router.put("/{party_id}")
async def update_party(
    party_id: int,
    party_data: dict = Body(...),
    party_service: PartyService = Depends(),
    user: Account = Depends(authenticate_user)
) -> Party:
    """
    Update an existing party registration.

    - Students: provide party_datetime, place_id, and contact_two_id (contact_one is auto-filled)
    - Admins: provide party_datetime, place_id, contact_one_id, and contact_two_id

    The location will be automatically created if it doesn't exist in the database.
    """
    if user.role == AccountRole.STUDENT:
        # Parse as StudentCreatePartyDTO
        dto = StudentCreatePartyDTO(**party_data)
        return await party_service.update_party_from_student_dto(party_id, dto, user.id)
    elif user.role == AccountRole.ADMIN:
        # Parse as AdminCreatePartyDTO
        dto = AdminCreatePartyDTO(**party_data)
        return await party_service.update_party_from_admin_dto(party_id, dto)
    else:
        from src.core.exceptions import ForbiddenException
        raise ForbiddenException(detail="Only students and admins can update parties")


@party_router.get("/{party_id}")
async def get_party(
    party_id: int,
    party_service: PartyService = Depends(),
    _=Depends(authenticate_admin)
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
    _=Depends(authenticate_admin)
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
