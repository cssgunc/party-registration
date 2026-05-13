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

from .party_model import (
    AdminCreatePartyDto,
    CreatePartyDto,
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
            if user.role not in (AccountRole.STUDENT, AccountRole.STAFF, AccountRole.ADMIN):
                raise ForbiddenException(
                    detail="Only students, staff, and admins can host their own party"
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

    start_datetime = start_datetime.astimezone(UTC)
    end_datetime = end_datetime.astimezone(UTC)

    if start_datetime > end_datetime:
        raise BadRequestException("Start date must be less than or equal to end date")

    return await party_service.get_proximity_search(place_id, start_datetime, end_datetime)


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
    exporter = (
        party_service.export_parties_to_excel_police
        if principal.principal_type == "police"
        else party_service.export_parties_to_excel_staff
    )
    excel_content = exporter(parties_response)
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
            if user.role not in (AccountRole.STUDENT, AccountRole.STAFF, AccountRole.ADMIN):
                raise ForbiddenException(
                    detail="Only students, staff, and admins can update their own party"
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
    return await party_service.get_party_by_id(party_id)


@party_router.post("/{party_id}/cancel")
async def cancel_party(
    party_id: int,
    party_service: PartyService = Depends(),
    user: AuthPrincipal = Depends(authenticate_by_role("student", "staff", "admin")),
) -> PartyDto:
    """
    Cancels a party registration by ID.

    Admins can cancel any party. Students and staff can only cancel parties they own.
    Idempotent: cancelling an already-cancelled party is a no-op.
    """
    student_id = user.id if user.role in (AccountRole.STUDENT, AccountRole.STAFF) else None
    return await party_service.cancel_party(party_id, student_id)


@party_router.post("/{party_id}/restore")
async def restore_party(
    party_id: int,
    party_service: PartyService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> PartyDto:
    return await party_service.restore_party(party_id)
