from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from src.core.authentication import (
    authenticate_admin,
    authenticate_by_role,
    authenticate_police_or_admin,
    authenticate_staff_or_admin,
    authenticate_user,
)
from src.core.exceptions import BadRequestException, ForbiddenException, UnprocessableEntityException
from src.modules.account.account_model import Account, AccountRole
from src.modules.location.location_service import LocationService

from .party_model import (
    AdminCreatePartyDTO,
    CreatePartyDTO,
    PaginatedPartiesResponse,
    Party,
    StudentCreatePartyDTO,
)
from .party_service import PartyService

party_router = APIRouter(prefix="/api/parties", tags=["parties"])


@party_router.post("/", status_code=201)
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
            raise ForbiddenException(detail="Only admins can use the admin party creation endpoint")
        return await party_service.create_party_from_admin_dto(party_data)
    else:
        raise ForbiddenException(detail="Invalid request type")


@party_router.get("/")
async def list_parties(
    page_number: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int | None = Query(None, ge=1, le=100, description="Items per page (default: all)"),
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
    total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 0

    return PaginatedPartiesResponse(
        items=parties,
        total_records=total_records,
        page_size=page_size,
        page_number=page_number,
        total_pages=total_pages,
    )


@party_router.get("/nearby")
async def get_parties_nearby(
    place_id: str = Query(..., description="Google Maps place ID"),
    start_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Start date (YYYY-MM-DD format)"),
    end_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="End date (YYYY-MM-DD format)"),
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
        start_datetime = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end_datetime = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        # Set end_datetime to end of day (23:59:59)
        end_datetime = end_datetime.replace(hour=23, minute=59, second=59)
    except ValueError as e:
        raise UnprocessableEntityException(f"Invalid date format. Expected YYYY-MM-DD: {str(e)}")

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
    start_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="End date in YYYY-MM-DD format"),
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
    except ValueError:
        raise UnprocessableEntityException("Invalid date format. Use YYYY-MM-DD format for dates.")

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
        return await party_service.update_party_from_student_dto(party_id, party_data, user.id)
    elif isinstance(party_data, AdminCreatePartyDTO):
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
