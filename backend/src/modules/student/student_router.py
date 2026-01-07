from fastapi import APIRouter, Depends, Query
from src.core.authentication import (
    authenticate_admin,
    authenticate_staff_or_admin,
    authenticate_student,
)
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


@student_router.get("/")
async def list_students(
    page_number: int | None = Query(
        None,
        ge=1,
        description="Page number (1-indexed). Optional.",
    ),
    page_size: int | None = Query(
        None,
        ge=1,
        le=100,
        description="Items per page. Optional, max 100.",
    ),
    student_service: StudentService = Depends(),
    _=Depends(authenticate_staff_or_admin),
) -> PaginatedStudentsResponse:
    """
    Returns all students in the database. Returns all students by default.
    Use page_number and page_size for pagination.

    Query Parameters:
    - page_number: The page number to retrieve (1-indexed, optional)
    - page_size: Number of items per page (optional, max: 100)

    Returns:
    - items: List of students
    - total_records: Total number of records in the database
    - page_size: Requested page size (or total_records if not paginating)
    - page_number: Requested page number (or 1 if not paginating)
    - total_pages: Total number of pages based on page size
    """
    # Get total count first
    total_records = await student_service.get_student_count()

    # If pagination params not provided, return all students
    if page_number is None or page_size is None:
        students = await student_service.get_students()
        return PaginatedStudentsResponse(
            items=students,
            total_records=total_records,
            page_size=total_records,
            page_number=1,
            total_pages=1 if total_records > 0 else 0,
        )

    # Calculate skip and limit for pagination
    skip = (page_number - 1) * page_size

    # Get students with pagination
    students = await student_service.get_students(skip=skip, limit=page_size)

    # Calculate total pages (ceiling division)
    total_pages = (total_records + page_size - 1) // page_size if total_records > 0 else 0

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
    _=Depends(authenticate_staff_or_admin),
) -> StudentDto:
    return await student_service.get_student_by_id(student_id)


@student_router.post("/", status_code=201)
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
