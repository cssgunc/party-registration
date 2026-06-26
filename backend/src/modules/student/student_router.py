from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Response
from src.core.authentication import authenticate_by_role
from src.core.exceptions import error_response
from src.core.utils.query_utils import (
    PAGINATED_QUERY_RESPONSES,
    ListQueryParams,
    get_paginated_openapi_params,
    parse_export_list_query_params,
    parse_list_query_params,
)
from src.modules.auth.auth_model import AuthPrincipal
from src.modules.location.location_model import LocationDto
from src.modules.party.party_model import PartyStudentDto
from src.modules.party.party_service import PartyService

from .student_model import (
    AutocompleteInput,
    IsRegisteredUpdate,
    PaginatedStudentsResponse,
    ResidenceUpdateDto,
    SelfUpdateStudentDto,
    StudentDto,
    StudentSelfDto,
    StudentSuggestionDto,
    StudentUpdateDto,
)
from .student_service import StudentService

student_router = APIRouter(prefix="/api/students", tags=["students"])
_OPENAPI_PARAMS = get_paginated_openapi_params(StudentService.QUERY_FIELDS)

# Shared OpenAPI error responses for endpoints that update a student's phone number.
# Both the self-update and admin-update paths can surface a phone conflict.
_PHONE_CONFLICT_RESPONSES = {
    409: error_response("Phone number is already in use by another account"),
}


@student_router.get(
    "/me",
    summary="Get the authenticated student's profile",
    responses={
        404: error_response("Student profile not found for the authenticated account"),
    },
)
async def get_me(
    student_service: StudentService = Depends(),
    user: AuthPrincipal = Depends(authenticate_by_role("student", "staff", "admin")),
) -> StudentSelfDto:
    """Get the current student's profile, including residence and Party Smart registration status.

    Residence incidents are restricted to type and date/time in this view.
    Returns a partial DTO (null phone/preference) when the student row does
    not yet exist.
    """
    return await student_service.get_student_me_dto(user.id)


@student_router.put(
    "/me",
    summary="Update the authenticated student's contact info",
    responses={
        404: error_response("Account not found when creating student profile"),
        **_PHONE_CONFLICT_RESPONSES,
    },
)
async def update_me(
    data: SelfUpdateStudentDto,
    student_service: StudentService = Depends(),
    user: AuthPrincipal = Depends(authenticate_by_role("student", "staff", "admin")),
) -> StudentSelfDto:
    """Update the authenticated student's phone number and contact preference.

    Creates the student row if it does not yet exist (upsert). Residence is
    managed separately via ``PUT /api/students/me/residence``.
    """
    return await student_service.update_student_self(user.id, data)


@student_router.put(
    "/me/residence",
    summary="Set the authenticated student's residence",
    responses={
        400: error_response("Residence has already been chosen for this academic year"),
        404: error_response("Student not found, or place ID not found in Google Maps"),
        409: error_response(
            "A location with the given Google place ID already exists (rare race condition)"
        ),
        500: error_response("Google Maps API error while resolving the place ID"),
    },
)
async def update_my_residence(
    data: ResidenceUpdateDto,
    student_service: StudentService = Depends(),
    user: AuthPrincipal = Depends(authenticate_by_role("student", "staff", "admin")),
) -> LocationDto:
    """Set or update the authenticated student's residence for the current academic year.

    Residence selection is locked to once per academic year. The location is
    created via Google Maps if not already in the DB. Admins can bypass this
    restriction using ``PUT /api/students/{student_id}``.
    """
    return await student_service.update_residence(user.id, data.residence_place_id)


@student_router.get(
    "/me/parties",
    summary="List the authenticated student's parties",
)
async def get_my_parties(
    party_service: PartyService = Depends(),
    user: AuthPrincipal = Depends(authenticate_by_role("student", "staff", "admin")),
) -> list[PartyStudentDto]:
    """Get all non-cancelled parties for the authenticated student (no pagination)."""
    return await party_service.get_parties_for_student(user.id)


@student_router.get(
    "",
    summary="List students (paginated)",
    openapi_extra=_OPENAPI_PARAMS,
    responses=PAGINATED_QUERY_RESPONSES,
)
async def list_students(
    params: ListQueryParams = parse_list_query_params(),
    student_service: StudentService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin")),
) -> PaginatedStudentsResponse:
    """List students with pagination, sorting, and filtering (staff/admin only)."""
    return await student_service.get_students_paginated(params)


@student_router.get(
    "/csv",
    summary="Export students as an Excel file",
    openapi_extra=_OPENAPI_PARAMS,
    responses=PAGINATED_QUERY_RESPONSES,
)
async def get_students_csv(
    params: ListQueryParams = parse_export_list_query_params(),
    student_service: StudentService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin")),
) -> Response:
    """Export students as an Excel file (staff/admin only).

    Supports the same filter/sort query params as ``GET /api/students``.
    Returns a ``.xlsx`` attachment with columns: Onyen, PID, First Name,
    Last Name, Email, Phone Number, Contact Preference, Is Registered,
    and Residence Address.
    """
    students_response = await student_service.get_students_paginated(params)
    excel_content = student_service.export_students_to_excel(students_response)
    filename = f"students_{datetime.now(ZoneInfo('America/New_York')).strftime('%Y_%m_%d')}.xlsx"
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@student_router.post(
    "/autocomplete",
    summary="Autocomplete student search",
)
async def autocomplete_students(
    input_data: AutocompleteInput,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin")),
) -> list[StudentSuggestionDto]:
    """Return up to 10 student suggestions matching the query.

    Matches against PID, email, onyen, phone number, first name, last name,
    and full name. Each result includes the field that produced the match.
    """
    return await student_service.autocomplete_students(input_data.query)


@student_router.get(
    "/{student_id}",
    summary="Get a student by ID",
    responses={
        404: error_response("Student with the given ID was not found"),
    },
)
async def get_student(
    student_id: int,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin")),
) -> StudentDto:
    """Get a single student's full profile by account ID (staff/admin only)."""
    return await student_service.get_student_by_id(student_id)


@student_router.put(
    "/{student_id}",
    summary="Update a student (admin)",
    responses={
        404: error_response(
            "Student with the given ID was not found, "
            "or the provided residence place ID was not found in Google Maps"
        ),
        **_PHONE_CONFLICT_RESPONSES,
        500: error_response("Google Maps API error when fetching location details"),
    },
)
async def update_student(
    student_id: int,
    data: StudentUpdateDto,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> StudentDto:
    """Update a student's contact info and optionally their residence (admin only).

    Admins can set ``residence_place_id`` at any time without the academic-year
    restriction that applies to the ``PUT /me/residence`` endpoint.
    """
    return await student_service.update_student(student_id, data)


@student_router.patch(
    "/{student_id}/is-registered",
    summary="Update a student's Party Smart registration status",
    responses={
        404: error_response("Student with the given ID was not found"),
    },
)
async def update_is_registered(
    student_id: int,
    data: IsRegisteredUpdate,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin")),
) -> StudentDto:
    """Mark a student as registered or unregistered for Party Smart (staff/admin only).

    Setting ``is_registered`` to True records the current timestamp as
    ``last_registered``; False clears it.
    """
    return await student_service.update_is_registered(student_id, data.is_registered)
