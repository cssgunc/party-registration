from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from src.core.authentication import (
    authenticate_by_role,
    authenticate_user,
)
from src.core.exceptions import (
    BadRequestException,
    ForbiddenException,
    UnprocessableEntityException,
)
from src.core.utils.query_utils import (
    ListQueryParams,
    get_paginated_openapi_params,
    parse_export_list_query_params,
    parse_list_query_params,
)
from src.modules.account.account_model import AccountRole
from src.modules.auth.auth_model import AuthPrincipal
from src.modules.location.location_service import LocationNotFoundException, LocationService

from .party_model import (
    AdminCreatePartyDto,
    CreatePartyDto,
    ExactMatchDto,
    PaginatedPartiesResponse,
    PartyDto,
    ProximitySearchResponse,
    StudentCreatePartyDto,
)
from .party_service import PartyService

party_router = APIRouter(prefix="/api/parties", tags=["parties"])
_OPENAPI_PARAMS = get_paginated_openapi_params(PartyService.QUERY_FIELDS)


@party_router.post("", status_code=201)
async def create_party(
    party_data: CreatePartyDto,
    party_service: PartyService = Depends(),
    user: AuthPrincipal = Depends(authenticate_user),
) -> PartyDto:
    """
    Create a new party registration.

    - Students: provide type="student", party_datetime, and contact_two (ContactDTO)
      - contact_one is auto-filled from the authenticated student
      - Party location is automatically derived from the student's residence
    - Admins: provide type="admin", party_datetime, google_place_id, contact_one_student_id, and
      contact_two (ContactDTO)
      - contact_one_student_id identifies the first contact by student account ID
      - contact_two is a ContactDTO with email, first_name, last_name, phone_number, and
        contact_preference

    The location will be automatically created if it doesn't exist in the database.
    """
    # Validate that the DTO type matches the user's role
    match party_data:
        case StudentCreatePartyDto():
            if user.role != AccountRole.STUDENT:
                raise ForbiddenException(
                    detail="Only students can use the student party creation endpoint"
                )
            return await party_service.create_party_from_student_dto(party_data, user.id)
        case AdminCreatePartyDto():
            if user.role != AccountRole.ADMIN:
                raise ForbiddenException(
                    detail="Only admins can use the admin party creation endpoint"
                )
            return await party_service.create_party_from_admin_dto(party_data)
        case _:
            raise ForbiddenException(detail="Invalid request type")


@party_router.get("", openapi_extra=_OPENAPI_PARAMS)
async def list_parties(
    params: ListQueryParams = parse_list_query_params(),
    party_service: PartyService = Depends(),
    _=Depends(authenticate_by_role("admin", "staff", "officer", "police_admin")),
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
    return await party_service.get_parties_paginated(params)


@party_router.get("/nearby")
async def get_parties_nearby(
    place_id: str = Query(..., description="Google Maps place ID"),
    start_datetime: datetime = Query(
        ..., alias="start_date", description="Start of search window (ISO 8601 with timezone)"
    ),
    end_datetime: datetime = Query(
        ..., alias="end_date", description="End of search window (ISO 8601 with timezone)"
    ),
    party_service: PartyService = Depends(),
    location_service: LocationService = Depends(),
    _=Depends(authenticate_by_role("officer", "police_admin", "admin")),
) -> ProximitySearchResponse:
    """
    Returns a ProximitySearchResponse with an exact_match and a list of nearby parties.

    The exact_match always reflects the searched place ID:
    - location is null if the place has no DB record yet
    - party is null if no confirmed party exists at that location in the date range

    The nearby list contains confirmed parties within 0.25 miles, sorted by distance.

    Query Parameters:
    - place_id: Google Maps place ID from autocomplete selection
    - start_date: Start of the search window (ISO 8601 with timezone)
    - end_date: End of the search window (ISO 8601 with timezone)

    Raises:
    - 400: If place ID is invalid or datetimes are in wrong format
    - 404: If place ID is not found in Google Maps
    - 403: If user is not a police officer or admin
    """
    if start_datetime.tzinfo is None:
        raise UnprocessableEntityException("start_date must include timezone information")
    if end_datetime.tzinfo is None:
        raise UnprocessableEntityException("end_date must include timezone information")

    # Normalize to UTC for consistent DB comparisons
    start_datetime = start_datetime.astimezone(UTC)
    end_datetime = end_datetime.astimezone(UTC)

    if start_datetime > end_datetime:
        raise BadRequestException("Start date must be less than or equal to end date")

    # Try to find the location in the DB (may not exist for unregistered addresses)
    try:
        db_location = await location_service.get_location_by_place_id(place_id)
    except LocationNotFoundException:
        db_location = None

    # Only call Google Maps API when the location isn't in the DB
    if db_location is not None:
        formatted_address = db_location.formatted_address
        search_lat = float(db_location.latitude)
        search_lon = float(db_location.longitude)
    else:
        location_data = await location_service.get_place_details(place_id)
        formatted_address = location_data.formatted_address
        search_lat = location_data.latitude
        search_lon = location_data.longitude

    # Find a party at this exact location within the date range (if DB location exists)
    exact_party = None
    if db_location is not None:
        exact_party = await party_service.get_party_at_location_in_date_range(
            location_id=db_location.id,
            start_date=start_datetime,
            end_date=end_datetime,
        )

    exact_match = ExactMatchDto(
        google_place_id=place_id,
        formatted_address=formatted_address,
        location=db_location,
        party=exact_party,
    )

    # Perform proximity search with date range (sorted by distance)
    nearby = await party_service.get_parties_by_radius_and_date_range(
        latitude=search_lat,
        longitude=search_lon,
        start_date=start_datetime,
        end_date=end_datetime,
    )

    if exact_party is not None:
        nearby = [p for p in nearby if p.id != exact_party.id]

    return ProximitySearchResponse(exact_match=exact_match, nearby=nearby)


@party_router.get("/csv", openapi_extra=_OPENAPI_PARAMS)
async def get_parties_csv(
    params: ListQueryParams = parse_export_list_query_params(),
    party_service: PartyService = Depends(),
    principal: AuthPrincipal = Depends(
        authenticate_by_role("officer", "police_admin", "staff", "admin")
    ),
) -> Response:
    """
    Returns all parties as an Excel file, with columns tailored to the requester's role.

    Police users get 11 columns (full names, no residence).
    Staff/admin users get 15 columns (split names, includes residence).

    Supports the same filter/sort query params as GET /api/parties.
    """
    parties_response = await party_service.get_parties_paginated(params)
    is_police = principal.principal_type == "police"
    excel_content = party_service.export_parties_to_excel(
        parties_response,
        is_police=is_police,
    )
    filename = f"parties_{datetime.now(ZoneInfo('America/New_York')).strftime('%Y_%m_%d')}.xlsx"
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@party_router.put("/{party_id}")
async def update_party(
    party_id: int,
    party_data: CreatePartyDto,
    party_service: PartyService = Depends(),
    user: AuthPrincipal = Depends(authenticate_user),
) -> PartyDto:
    """
    Update an existing party registration.

    - Students: provide type="student", party_datetime, and contact_two (ContactDTO)
      - contact_one is auto-filled from the authenticated student
      - Party location is automatically derived from the student's residence
    - Admins: provide type="admin", party_datetime, google_place_id, contact_one_student_id, and
      contact_two (ContactDTO)
      - contact_one_student_id identifies the first contact by student account ID
      - contact_two is a ContactDTO with email, first_name, last_name, phone_number, and
        contact_preference

    The location will be automatically created if it doesn't exist in the database.
    """
    # Validate that the DTO type matches the user's role
    match party_data:
        case StudentCreatePartyDto():
            if user.role != AccountRole.STUDENT:
                raise ForbiddenException(
                    detail="Only students can use the student party update endpoint"
                )
            return await party_service.update_party_from_student_dto(party_id, party_data, user.id)
        case AdminCreatePartyDto():
            if user.role != AccountRole.ADMIN:
                raise ForbiddenException(
                    detail="Only admins can use the admin party update endpoint"
                )
            return await party_service.update_party_from_admin_dto(party_id, party_data)
        case _:
            raise ForbiddenException(detail="Invalid request type")


@party_router.get("/{party_id}")
async def get_party(
    party_id: int,
    party_service: PartyService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin")),
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
    user: AuthPrincipal = Depends(authenticate_by_role("student", "admin")),
) -> PartyDto:
    """
    Deletes a party registration by ID.

    Parameters:
    - party_id: The ID of the party to delete

    Returns:
    - The deleted party registration

    Raises:
    - 404: If party with the specified ID does not exist
    """
    if user.role == AccountRole.STUDENT:
        return await party_service.cancel_party_as_student(party_id, user.id)
    else:
        return await party_service.delete_party(party_id)
