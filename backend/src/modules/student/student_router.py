from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Response
from src.core.authentication import authenticate_by_role
from src.core.utils.query_utils import (
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


@student_router.get(
    "/me",
    responses={
        404: {"description": "Student profile not found for the authenticated account"},
    },
)
async def get_me(
    student_service: StudentService = Depends(),
    user: AuthPrincipal = Depends(authenticate_by_role("student", "staff", "admin")),
) -> StudentSelfDto:
    return await student_service.get_student_me_dto(user.id)


@student_router.put(
    "/me",
    responses={
        404: {"description": "Account not found when creating student profile"},
        409: {"description": "Phone number is already in use by another account"},
    },
)
async def update_me(
    data: SelfUpdateStudentDto,
    student_service: StudentService = Depends(),
    user: AuthPrincipal = Depends(authenticate_by_role("student", "staff", "admin")),
) -> StudentSelfDto:
    return await student_service.update_student_self(user.id, data)


@student_router.put(
    "/me/residence",
    responses={
        400: {"description": "Residence has already been chosen for this academic year"},
        404: {"description": "Student not found, or place ID not found in Google Maps"},
        409: {"description": "Location with the given Google place ID already exists"},
        500: {"description": "Google Maps API error (timeout, transport error, or API error)"},
    },
)
async def update_my_residence(
    data: ResidenceUpdateDto,
    student_service: StudentService = Depends(),
    user: AuthPrincipal = Depends(authenticate_by_role("student", "staff", "admin")),
) -> LocationDto:
    return await student_service.update_residence(user.id, data.residence_place_id)


@student_router.get("/me/parties")
async def get_my_parties(
    party_service: PartyService = Depends(),
    user: AuthPrincipal = Depends(authenticate_by_role("student", "staff", "admin")),
) -> list[PartyStudentDto]:
    return await party_service.get_parties_for_student(user.id)


@student_router.get(
    "",
    openapi_extra=_OPENAPI_PARAMS,
    responses={
        400: {
            "description": "Invalid sort or filter parameter: unknown field or unsupported operator"
        },
    },
)
async def list_students(
    params: ListQueryParams = parse_list_query_params(),
    student_service: StudentService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin")),
) -> PaginatedStudentsResponse:
    """
    Returns all students with pagination and sorting.

    Query Parameters:
    - page_number: Page number (1-indexed, default: 1)
    - page_size: Items per page (default: all)
    - sort_by: Field to sort by
    - sort_order: Sort order (asc or desc, default: asc)

    Returns:
    - items: List of students
    - total_records: Total number of records
    - page_size: Items per page
    - page_number: Current page number
    - total_pages: Total number of pages
    """
    return await student_service.get_students_paginated(params)


@student_router.get(
    "/csv",
    openapi_extra=_OPENAPI_PARAMS,
    responses={
        400: {
            "description": "Invalid sort or filter parameter: unknown field or unsupported operator"
        },
    },
)
async def get_students_csv(
    params: ListQueryParams = parse_export_list_query_params(),
    student_service: StudentService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin")),
) -> Response:
    students_response = await student_service.get_students_paginated(params)
    excel_content = student_service.export_students_to_excel(students_response)
    filename = f"students_{datetime.now(ZoneInfo('America/New_York')).strftime('%Y_%m_%d')}.xlsx"
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@student_router.post("/autocomplete")
async def autocomplete_students(
    input_data: AutocompleteInput,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin")),
) -> list[StudentSuggestionDto]:
    return await student_service.autocomplete_students(input_data.query)


@student_router.get(
    "/{student_id}",
    responses={
        404: {"description": "Student with the given id was not found"},
    },
)
async def get_student(
    student_id: int,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin")),
) -> StudentDto:
    return await student_service.get_student_by_id(student_id)


@student_router.put(
    "/{student_id}",
    responses={
        404: {
            "description": "Student with the given id was not found, "
            "or the provided residence place ID was not found"
        },
        409: {"description": "Phone number is already in use by another account"},
        500: {"description": "Google Maps API error when fetching location details"},
    },
)
async def update_student(
    student_id: int,
    data: StudentUpdateDto,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> StudentDto:
    return await student_service.update_student(student_id, data)


@student_router.delete(
    "/{student_id}",
    responses={
        404: {"description": "Student with the given id was not found"},
    },
)
async def delete_student(
    student_id: int,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> StudentDto:
    return await student_service.delete_student(student_id)


@student_router.patch(
    "/{student_id}/is-registered",
    responses={
        404: {"description": "Student with the given id was not found"},
        409: {"description": "Phone number is already in use by another account"},
    },
)
async def update_is_registered(
    student_id: int,
    data: IsRegisteredUpdate,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin")),
) -> StudentDto:
    """
    Update the registration status (attendance) for a student.
    Staff can use this to mark students as present/absent.
    """
    return await student_service.update_is_registered(student_id, data.is_registered)
