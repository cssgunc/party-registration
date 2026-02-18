from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response
from src.core.authentication import (
    authenticate_admin,
    authenticate_by_role,
    authenticate_police_or_admin,
    authenticate_staff_or_admin,
    authenticate_user,
)
from src.core.exceptions import (
    BadRequestException,
    ForbiddenException,
    UnprocessableEntityException,
)
from src.core.query_utils import PAGINATED_OPENAPI_PARAMS
from src.modules.account.account_model import AccountDto, AccountRole
from src.modules.location.location_service import LocationService

from .party_model import (
    AdminCreatePartyDto,
    CreatePartyDto,
    PaginatedPartiesResponse,
    PartyDto,
    StudentCreatePartyDto,
)
from .party_service import PartyService

party_router = APIRouter(prefix="/api/parties", tags=["parties"])


@party_router.post("", status_code=201)
async def create_party(
    party_data: CreatePartyDto,
    party_service: PartyService = Depends(),
    user: AccountDto = Depends(authenticate_user),
) -> PartyDto:
    """
    Create a new party registration.

    - Students: provide type="student", party_datetime, place_id, and contact_two (ContactDTO)
      - contact_one is auto-filled from the authenticated student
    - Admins: provide type="admin", party_datetime, place_id, contact_one_email, and
      contact_two (ContactDTO)
      - contact_one_email identifies the first contact by email
      - contact_two is a ContactDTO with email, first_name, last_name, phone_number, and
        contact_preference

    The location will be automatically created if it doesn't exist in the database.
    If contact_two's email doesn't exist in the system, a new student account will be created.
    """
    # Validate that the DTO type matches the user's role
    if isinstance(party_data, StudentCreatePartyDto):
        if user.role != AccountRole.STUDENT:
            raise ForbiddenException(
                detail="Only students can use the student party creation endpoint"
            )
        return await party_service.create_party_from_student_dto(party_data, user.id)
    elif isinstance(party_data, AdminCreatePartyDto):
        if user.role != AccountRole.ADMIN:
            raise ForbiddenException(detail="Only admins can use the admin party creation endpoint")
        return await party_service.create_party_from_admin_dto(party_data)
    else:
        raise ForbiddenException(detail="Invalid request type")


@party_router.get("", openapi_extra=PAGINATED_OPENAPI_PARAMS)
async def list_parties(
    request: Request,
    party_service: PartyService = Depends(),
    _=Depends(authenticate_by_role("admin", "staff", "police")),
) -> PaginatedPartiesResponse:
    """
    Returns all party registrations with pagination, sorting, and filtering.

    Query Parameters:
    - page_number: Page number (1-indexed, default: 1)
    - page_size: Items per page (default: all)
    - sort_by: Field to sort by (allowed: party_datetime, location_id, contact_one_id, id)
    - sort_order: Sort order (asc or desc, default: asc)
    - location_id: Filter by location ID
    - contact_one_id: Filter by contact one (student) ID

    Features:
    - **Opt-in**: All features have sensible defaults - no parameters returns all parties
    - **Server-side**: All sorting, filtering, and pagination happens in the database
    - **Performant**: Scales well with large datasets

    Returns:
    - items: List of party registrations for the current page
    - total_records: Total number of records matching filters
    - page_size: Items per page
    - page_number: Current page number
    - total_pages: Total number of pages

    Examples:
    - Get all parties: GET /api/parties/
    - Get first page of 10: GET /api/parties/?page_size=10
    - Sort by date descending: GET /api/parties/?sort_by=party_datetime&sort_order=desc
    - Filter by location: GET /api/parties/?location_id=5
    - Combined: GET /api/parties/?location_id=5&sort_by=party_datetime&page_size=20
    """
    return await party_service.get_parties_paginated(request=request)


@party_router.get("/nearby")
async def get_parties_nearby(
    place_id: str = Query(..., description="Google Maps place ID"),
    start_date: str = Query(
        ..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Start date (YYYY-MM-DD format)"
    ),
    end_date: str = Query(
        ..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="End date (YYYY-MM-DD format)"
    ),
    party_service: PartyService = Depends(),
    location_service: LocationService = Depends(),
    _=Depends(authenticate_police_or_admin),
) -> list[PartyDto]:
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
        start_datetime = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=UTC)
        end_datetime = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=UTC)
        # Set end_datetime to end of day (23:59:59)
        end_datetime = end_datetime.replace(hour=23, minute=59, second=59)
    except ValueError as e:
        raise UnprocessableEntityException(f"Invalid date format. Expected YYYY-MM-DD: {e}") from e

    # Validate that start_date is not greater than end_date
    if start_datetime > end_datetime:
        raise BadRequestException("Start date must be less than or equal to end date")

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


@party_router.get("/csv")
async def get_parties_csv(
    start_date: str = Query(
        ..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Start date in YYYY-MM-DD format"
    ),
    end_date: str = Query(
        ..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="End date in YYYY-MM-DD format"
    ),
    party_service: PartyService = Depends(),
    _=Depends(authenticate_admin),
) -> Response:
    """
    Returns parties within the specified date range as a CSV file.

    Query Parameters:
    - start_date: Start date in YYYY-MM-DD format (required)
    - end_date: End date in YYYY-MM-DD format (required)

    Returns:
    - CSV file stream with party data

    Raises:
    - 400: If date format is invalid
    """
    try:
        start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
        end_datetime = datetime.strptime(end_date, "%Y-%m-%d")
        end_datetime = end_datetime.replace(hour=23, minute=59, second=59, microsecond=999999)
    except ValueError as e:
        raise UnprocessableEntityException(
            "Invalid date format. Use YYYY-MM-DD format for dates."
        ) from e

    # Validate that start_date is not greater than end_date
    if start_datetime > end_datetime:
        raise BadRequestException("Start date must be less than or equal to end date")

    parties = await party_service.get_parties_by_date_range(start_datetime, end_datetime)
    csv_content = await party_service.export_parties_to_csv(parties)

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=parties.csv"},
    )


@party_router.put("/{party_id}")
async def update_party(
    party_id: int,
    party_data: CreatePartyDto,
    party_service: PartyService = Depends(),
    user: AccountDto = Depends(authenticate_user),
) -> PartyDto:
    """
    Update an existing party registration.

    - Students: provide type="student", party_datetime, place_id, and contact_two (ContactDTO)
      - contact_one is auto-filled from the authenticated student
    - Admins: provide type="admin", party_datetime, place_id, contact_one_email, and
      contact_two (ContactDTO)
      - contact_one_email identifies the first contact by email
      - contact_two is a ContactDTO with email, first_name, last_name, phone_number, and
        contact_preference

    The location will be automatically created if it doesn't exist in the database.
    If contact_two's email doesn't exist in the system, a new student account will be created.
    """
    # Validate that the DTO type matches the user's role
    if isinstance(party_data, StudentCreatePartyDto):
        if user.role != AccountRole.STUDENT:
            raise ForbiddenException(
                detail="Only students can use the student party update endpoint"
            )
        return await party_service.update_party_from_student_dto(party_id, party_data, user.id)
    elif isinstance(party_data, AdminCreatePartyDto):
        if user.role != AccountRole.ADMIN:
            raise ForbiddenException(detail="Only admins can use the admin party update endpoint")
        return await party_service.update_party_from_admin_dto(party_id, party_data)
    else:
        raise ForbiddenException(detail="Invalid request type")


@party_router.get("/{party_id}")
async def get_party(
    party_id: int,
    party_service: PartyService = Depends(),
    _=Depends(authenticate_staff_or_admin),
) -> PartyDto:
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
    user: AccountDto = Depends(authenticate_user),
) -> PartyDto:
    """
    Deletes or cancels a party registration by ID.

    - Students: Changes party status to "cancelled" (can only cancel their own parties)
    - Admins: Permanently deletes the party from the database

    Parameters:
    - party_id: The ID of the party to delete/cancel

    Returns:
    - The deleted/cancelled party registration

    Raises:
    - 404: If party with the specified ID does not exist
    - 403: If user lacks permission (staff/police) or student tries to cancel another's party
    """
    if user.role == AccountRole.STUDENT:
        # Students cancel their own parties
        return await party_service.cancel_party(party_id, user.id)
    elif user.role == AccountRole.ADMIN:
        # Admins permanently delete parties
        return await party_service.delete_party(party_id)
    else:
        # Staff and police cannot delete/cancel parties
        raise ForbiddenException(detail="Insufficient privileges")
