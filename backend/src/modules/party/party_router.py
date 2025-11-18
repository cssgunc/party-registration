from fastapi import APIRouter, Depends, Query
from src.core.authentication import (
    authenticate_admin,
    authenticate_by_role,
    authenticate_staff_or_admin,
    authenticate_user,
)
from src.core.exceptions import ForbiddenException
from src.modules.account.account_model import Account, AccountRole

from .party_model import (
    AdminCreatePartyDTO,
    CreatePartyDTO,
    PaginatedPartiesResponse,
    Party,
    StudentCreatePartyDTO,
)
from .party_service import PartyService

party_router = APIRouter(prefix="/api/parties", tags=["parties"])


@party_router.post("/")
async def create_party(
    party_data: CreatePartyDTO,
    party_service: PartyService = Depends(),
    user: Account = Depends(authenticate_user),
) -> Party:
    """
    Create a new party registration.

    - Students: provide type="student", party_datetime, place_id, and contact_two (ContactDTO)
      - contact_one is auto-filled from the authenticated student
    - Admins: provide type="admin", party_datetime, place_id, contact_one_email, and contact_two (ContactDTO)
      - contact_one_email identifies the first contact by email
      - contact_two is a ContactDTO with email, first_name, last_name, phone_number, and contact_preference

    The location will be automatically created if it doesn't exist in the database.
    If contact_two's email doesn't exist in the system, a new student account will be created.
    """
    # Validate that the DTO type matches the user's role
    if isinstance(party_data, StudentCreatePartyDTO):
        if user.role != AccountRole.STUDENT:
            raise ForbiddenException(
                detail="Only students can use the student party creation endpoint"
            )
        return await party_service.create_party_from_student_dto(party_data, user.id)
    elif isinstance(party_data, AdminCreatePartyDTO):
        if user.role != AccountRole.ADMIN:
            raise ForbiddenException(
                detail="Only admins can use the admin party creation endpoint"
            )
        return await party_service.create_party_from_admin_dto(party_data)
    else:
        raise ForbiddenException(detail="Invalid request type")


@party_router.get("/")
async def list_parties(
    page_number: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int | None = Query(
        None, ge=1, le=100, description="Items per page (default: all)"
    ),
    party_service: PartyService = Depends(),
    _=Depends(authenticate_by_role("admin", "staff", "police")),
) -> PaginatedPartiesResponse:
    """
    Returns all party registrations in the database with optional pagination.

    Query Parameters:
    - page_number: The page number to retrieve (1-indexed)
    - page_size: Number of items per page (max 100, default: returns all parties)

    Returns:
    - items: List of party registrations
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
            items=parties,
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
        items=parties,
        total_records=total_records,
        page_size=page_size,
        page_number=page_number,
        total_pages=total_pages,
    )


@party_router.put("/{party_id}")
async def update_party(
    party_id: int,
    party_data: CreatePartyDTO,
    party_service: PartyService = Depends(),
    user: Account = Depends(authenticate_user),
) -> Party:
    """
    Update an existing party registration.

    - Students: provide type="student", party_datetime, place_id, and contact_two (ContactDTO)
      - contact_one is auto-filled from the authenticated student
    - Admins: provide type="admin", party_datetime, place_id, contact_one_email, and contact_two (ContactDTO)
      - contact_one_email identifies the first contact by email
      - contact_two is a ContactDTO with email, first_name, last_name, phone_number, and contact_preference

    The location will be automatically created if it doesn't exist in the database.
    If contact_two's email doesn't exist in the system, a new student account will be created.
    """
    # Validate that the DTO type matches the user's role
    if isinstance(party_data, StudentCreatePartyDTO):
        if user.role != AccountRole.STUDENT:
            raise ForbiddenException(
                detail="Only students can use the student party update endpoint"
            )
        return await party_service.update_party_from_student_dto(
            party_id, party_data, user.id
        )
    elif isinstance(party_data, AdminCreatePartyDTO):
        if user.role != AccountRole.ADMIN:
            raise ForbiddenException(
                detail="Only admins can use the admin party update endpoint"
            )
        return await party_service.update_party_from_admin_dto(party_id, party_data)
    else:
        raise ForbiddenException(detail="Invalid request type")


@party_router.get("/{party_id}")
async def get_party(
    party_id: int,
    party_service: PartyService = Depends(),
    _=Depends(authenticate_staff_or_admin),
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
