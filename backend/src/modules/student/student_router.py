from fastapi import APIRouter, Depends
from src.core.authentication import authenticate_admin

from .student_model import StudentCreate, StudentData, StudentDTO
from .student_service import StudentService

student_router = APIRouter(prefix="/api/students", tags=["students"])


@student_router.get("/")
async def list_students(
    student_service: StudentService = Depends(), _=Depends(authenticate_admin)
) -> list[StudentDTO]:
    return await student_service.get_students()


@student_router.get("/{student_id}")
async def get_student(
    student_id: int,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_admin),
) -> StudentDTO:
    return await student_service.get_student_by_id(student_id)


@student_router.post("/", status_code=201)
async def create_student(
    payload: StudentCreate,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_admin),
) -> StudentDTO:
    return await student_service.create_student(payload.data, payload.account_id)


@student_router.put("/{student_id}")
async def update_student(
    student_id: int,
    data: StudentData,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_admin),
) -> StudentDTO:
    return await student_service.update_student(student_id, data)


@student_router.delete("/{student_id}")
async def delete_student(
    student_id: int,
    student_service: StudentService = Depends(),
    _=Depends(authenticate_admin),
) -> StudentDTO:
    return await student_service.delete_student(student_id)
