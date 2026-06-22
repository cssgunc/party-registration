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
    error_response,
)
from src.core.utils.query_utils import (
    PAGINATED_QUERY_RESPONSES,
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
    PaginatedPartiesPoliceResponse,
    PaginatedPartiesResponse,
    PartyDto,
    PartyRuleErrorResponse,
    ProximitySearchResponse,
    StudentCreatePartyDto,
)
from .party_service import PartyRule, PartyService

party_router = APIRouter(prefix="/api/parties", tags=["parties"])
_OPENAPI_PARAMS = get_paginated_openapi_params(PartyService.QUERY_FIELDS)
_PARTY_RULE_CODES = ", ".join(rule.value for rule in PartyRule)

# Shared OpenAPI error responses for the create/update endpoints, which run the
# party rule suite and resolve a location (admin flow).
_PARTY_WRITE_RESPONSES = {
    400: {
        "model": PartyRuleErrorResponse,
        "description": f"Party rule validation failed. Possible rule codes: {_PARTY_RULE_CODES}",
    },
    409: error_response(
        "A location with the same Google place ID already exists (rare race condition)"
    ),
    500: error_response("Google Maps API request failed while resolving the location (admin only)"),
}

# Request body examples shown in the OpenAPI docs for party creation. The body is
# a discriminated union, so we document one example per `type`.
_CREATE_PARTY_EXAMPLES = {
    "requestBody": {
        "content": {
            "application/json": {
                "examples": {
                    "student": {
                        "summary": "Student hosting their own party",
                        "value": {
                            "type": "student",
                            "party_datetime": "2026-09-15T22:00:00-04:00",
                            "contact_two": {
                                "email": "jordan@unc.edu",
                                "first_name": "Jordan",
                                "last_name": "Doe",
                                "phone_number": "9195551234",
                                "contact_preference": "text",
                            },
                        },
                    },
                    "admin": {
                        "summary": "Admin registering on a student's behalf",
                        "value": {
                            "type": "admin",
                            "party_datetime": "2026-09-15T22:00:00-04:00",
                            "google_place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
                            "contact_one_student_id": 42,
                            "contact_two": {
                                "email": "jordan@unc.edu",
                                "first_name": "Jordan",
                                "last_name": "Doe",
                                "phone_number": "9195551234",
                                "contact_preference": "text",
                            },
                        },
                    },
                }
            }
        }
    }
}


@party_router.post(
    "",
    status_code=201,
    summary="Register a party",
    openapi_extra=_CREATE_PARTY_EXAMPLES,
    responses={
        **_PARTY_WRITE_RESPONSES,
        404: error_response(
            "The referenced contact student or Google Maps place was not found (admin only)"
        ),
    },
)
async def create_party(
    party_data: CreatePartyDto,
    party_service: PartyService = Depends(),
    user: AuthPrincipal = Depends(authenticate_user),
) -> PartyDto:
    """Create a new party registration.

    The request body is discriminated on ``type``:

    - **student**: provide ``party_datetime`` and ``contact_two``. ``contact_one``
      is the authenticated student and the location is derived from their residence.
    - **admin**: provide ``party_datetime``, ``google_place_id``,
      ``contact_one_student_id``, and ``contact_two``. The location is created if
      it does not already exist.

    Raises:
        ForbiddenException: If the body ``type`` is not allowed for the caller's role.
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


@party_router.get(
    "",
    summary="List parties (paginated)",
    openapi_extra=_OPENAPI_PARAMS,
    responses=PAGINATED_QUERY_RESPONSES,
)
async def list_parties(
    params: ListQueryParams = parse_list_query_params(),
    party_service: PartyService = Depends(),
    principal: AuthPrincipal = Depends(
        authenticate_by_role("admin", "staff", "officer", "police_admin")
    ),
) -> PaginatedPartiesResponse | PaginatedPartiesPoliceResponse:
    """List parties with pagination, sorting, and filtering.

    Police principals receive the PII-stripped police view; staff and admins
    receive the full view.
    """
    return await party_service.get_parties_paginated(
        params, as_police=principal.principal_type == "police"
    )


@party_router.get(
    "/nearby",
    summary="Search for parties near a location",
    responses={
        400: error_response(
            "Start date is after end date, or the provided place ID has an invalid format"
        ),
        500: error_response(
            "Google Maps API request failed while resolving the place ID to coordinates"
        ),
    },
)
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
    """Find confirmed parties at and near a searched place, within a date window.

    The response's ``exact_match`` always reflects the searched place ID (its
    ``location`` is null if not yet in the DB, its ``party`` is null if none is
    confirmed there in range). ``nearby`` lists confirmed parties within the
    configured search radius (``env.PARTY_SEARCH_RADIUS_MILES``), sorted by distance.

    Raises:
        UnprocessableEntityException: If a datetime is missing timezone info.
        BadRequestException: If ``start_date`` is after ``end_date``.
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


@party_router.get(
    "/csv",
    summary="Export parties as an Excel file",
    openapi_extra=_OPENAPI_PARAMS,
    responses=PAGINATED_QUERY_RESPONSES,
)
async def get_parties_csv(
    params: ListQueryParams = parse_export_list_query_params(),
    party_service: PartyService = Depends(),
    principal: AuthPrincipal = Depends(
        authenticate_by_role("officer", "police_admin", "staff", "admin")
    ),
) -> Response:
    """Export parties as an Excel file, with columns tailored to the requester's role.

    Police users get 11 columns (full names, no residence); staff and admins get
    15 columns (split names, includes residence). Supports the same filter/sort
    query params as ``GET /api/parties``.
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


@party_router.put(
    "/{party_id}",
    summary="Update a party",
    responses={
        **_PARTY_WRITE_RESPONSES,
        404: error_response("The party, contact student, or Google Maps place was not found"),
    },
)
async def update_party(
    party_id: int,
    party_data: CreatePartyDto,
    party_service: PartyService = Depends(),
    user: AuthPrincipal = Depends(authenticate_user),
) -> PartyDto:
    """Update an existing party registration.

    Same discriminated body as `create_party`. Students may only update
    parties they own; admins may update any.

    Raises:
        ForbiddenException: If the body ``type`` is not allowed for the caller's role.
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


@party_router.get(
    "/{party_id}",
    summary="Get a party by ID",
    responses={
        404: error_response("Party with the given ID was not found"),
    },
)
async def get_party(
    party_id: int,
    party_service: PartyService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin")),
) -> PartyDto:
    """Get a single party by ID (staff/admin view)."""
    return await party_service.get_party_by_id(party_id)


@party_router.post(
    "/{party_id}/cancel",
    summary="Cancel a party",
    responses={
        400: {
            "model": PartyRuleErrorResponse,
            "description": (
                f"Validation failed: {PartyRule.PARTY_NOT_OWNED_BY_STUDENT.value} "
                f"or {PartyRule.PARTY_IN_PAST.value}"
            ),
        },
        404: error_response("Party with the given ID was not found"),
    },
)
async def cancel_party(
    party_id: int,
    party_service: PartyService = Depends(),
    user: AuthPrincipal = Depends(authenticate_by_role("student", "staff", "admin")),
) -> PartyDto:
    """Cancel a party by ID; idempotent if already cancelled.

    Admins can cancel any party; students and staff can only cancel parties they
    own, and only before the party has occurred.
    """
    student_id = user.id if user.role in (AccountRole.STUDENT, AccountRole.STAFF) else None
    return await party_service.cancel_party(party_id, student_id)


@party_router.post(
    "/{party_id}/restore",
    summary="Restore a cancelled party",
    responses={
        404: error_response("Party with the given ID was not found"),
    },
)
async def restore_party(
    party_id: int,
    party_service: PartyService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> PartyDto:
    """Restore a cancelled party to CONFIRMED (admin only); idempotent if already confirmed."""
    return await party_service.restore_party(party_id)
