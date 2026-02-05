from fastapi import APIRouter, Depends, Request
from src.core.authentication import (
    authenticate_admin,
    authenticate_staff_or_admin,
    authenticate_student,
)
from src.core.query_utils import PAGINATED_OPENAPI_PARAMS
from src.modules.account.account_model import AccountDto
from src.modules.party.party_model import PartyDto
from src.modules.party.party_service import PartyService

from .student_model import (
    IsRegisteredUpdate,
    PaginatedStudentsResponse,
    StudentCreate,
    StudentData,
    StudentDataWithNames,
    StudentDto,
)
from .student_service import StudentService

student_router = APIRouter(prefix="/api/students", tags=["students"])


@student_router.get("/me")
async def get_me(
    student_service: StudentService = Depends(),
    user: "AccountDto" = Depends(authenticate_student),
) -> StudentDto:
    return await student_service.get_student_by_id(user.id)


@student_router.put("/me")
async def update_me(
    data: StudentData,
    student_service: StudentService = Depends(),
    user: "AccountDto" = Depends(authenticate_student),
) -> StudentDto:
    return await student_service.update_student(user.id, data)


@student_router.get("/me/parties")
async def get_my_parties(
    party_service: PartyService = Depends(),
    user: "AccountDto" = Depends(authenticate_student),
) -> list[PartyDto]:
    return await party_service.get_parties_by_contact(user.id)


@student_router.get("", openapi_extra=PAGINATED_OPENAPI_PARAMS)
async def list_students(
    request: Request,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_staff_or_admin),
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
    return await student_service.get_students_paginated(request=request)


@student_router.get("/{student_id}")
async def get_student(
    student_id: int,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_staff_or_admin),
) -> StudentDto:
    return await student_service.get_student_by_id(student_id)


@student_router.post("", status_code=201)
async def create_student(
    payload: StudentCreate,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_admin),
) -> StudentDto:
    return await student_service.create_student(payload.data, payload.account_id)


@student_router.put("/{student_id}")
async def update_student(
    student_id: int,
    data: StudentDataWithNames,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_admin),
) -> StudentDto:
    return await student_service.update_student(student_id, data)


@student_router.delete("/{student_id}")
async def delete_student(
    student_id: int,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_admin),
) -> StudentDto:
    return await student_service.delete_student(student_id)


@student_router.patch("/{student_id}/is-registered")
async def update_is_registered(
    student_id: int,
    data: IsRegisteredUpdate,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_staff_or_admin),
) -> StudentDto:
    """
    Update the registration status (attendance) for a student.
    Staff can use this to mark students as present/absent.
    """
    return await student_service.update_is_registered(student_id, data.is_registered)
