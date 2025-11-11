from fastapi import APIRouter, Depends, Query
from src.core.authentication import authenticate_admin, authenticate_student
from src.modules.account.account_model import Account
from src.modules.party.party_model import Party
from src.modules.party.party_service import PartyService

from .student_model import (
    PaginatedStudentsResponse,
    Student,
    StudentCreate,
    StudentData,
)
from .student_service import StudentService

student_router = APIRouter(prefix="/api/students", tags=["students"])


@student_router.get("/me")
async def get_me(
    student_service: StudentService = Depends(),
    user: "Account" = Depends(authenticate_student),
) -> Student:
    return await student_service.get_student_by_id(user.id)


@student_router.put("/me")
async def update_me(
    data: StudentData,
    student_service: StudentService = Depends(),
    user: "Account" = Depends(authenticate_student),
) -> Student:
    return await student_service.update_student(user.id, data)


@student_router.get("/me/parties")
async def get_my_parties(
    party_service: PartyService = Depends(),
    user: "Account" = Depends(authenticate_student),
) -> list[Party]:
    return await party_service.get_parties_by_contact(user.id)


@student_router.get("/")
async def list_students(
    page_number: int = Query(
        1,
        ge=1,
        description="Page number (1-indexed). Defaults to 1.",
    ),
    page_size: int = Query(
        10,
        ge=1,
        le=100,
        description="Items per page. Defaults to 10, max 100.",
    ),
    student_service: StudentService = Depends(),
    _=Depends(authenticate_admin),
) -> PaginatedStudentsResponse:
    """
    Returns all students in the database with pagination.

    Query Parameters:
    - page_number: The page number to retrieve (1-indexed, default: 1)
    - page_size: Number of items per page (default: 10, max: 100)

    Returns:
    - items: List of students
    - total_records: Total number of records in the database
    - page_size: Requested page size
    - page_number: Requested page number
    - total_pages: Total number of pages based on page size
    """
    # Get total count first
    total_records = await student_service.get_student_count()

    # Calculate skip and limit for pagination
    skip = (page_number - 1) * page_size

    # Get students with pagination
    students = await student_service.get_students(skip=skip, limit=page_size)

    # Calculate total pages (ceiling division)
    total_pages = (
        (total_records + page_size - 1) // page_size if total_records > 0 else 0
    )

    return PaginatedStudentsResponse(
        items=students,
        total_records=total_records,
        page_size=page_size,
        page_number=page_number,
        total_pages=total_pages,
    )


@student_router.get("/{student_id}")
async def get_student(
    student_id: int,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_admin),
) -> Student:
    return await student_service.get_student_by_id(student_id)


@student_router.post("/", status_code=201)
async def create_student(
    payload: StudentCreate,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_admin),
) -> Student:
    return await student_service.create_student(payload.data, payload.account_id)


@student_router.put("/{student_id}")
async def update_student(
    student_id: int,
    data: StudentData,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_admin),
) -> Student:
    return await student_service.update_student(student_id, data)


@student_router.delete("/{student_id}")
async def delete_student(
    student_id: int,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_admin),
) -> Student:
    return await student_service.delete_student(student_id)
