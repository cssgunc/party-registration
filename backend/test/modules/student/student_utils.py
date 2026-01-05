from datetime import datetime
from typing import Any, TypedDict, Unpack, override

from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.account.account_entity import AccountRole
from src.modules.student.student_entity import StudentEntity
from src.modules.student.student_model import (
    ContactPreference,
    DbStudent,
    Student,
    StudentCreate,
    StudentData,
    StudentDataWithNames,
)
from test.modules.account.account_utils import AccountTestUtils
from test.utils.resource_test_utils import ResourceTestUtils


class StudentOverrides(TypedDict, total=False):
    account_id: int
    contact_preference: ContactPreference
    last_registered: datetime | None
    phone_number: str
    first_name: str
    last_name: str
    email: str
    pid: str


class StudentTestUtils(
    ResourceTestUtils[
        StudentEntity,
        StudentData,
        Student | StudentDataWithNames | DbStudent,
    ]
):
    def __init__(self, session: AsyncSession, account_utils: AccountTestUtils):
        super().__init__(
            session,
            entity_class=StudentEntity,
            data_class=StudentData,
        )
        self.account_utils = account_utils

    @override
    @staticmethod
    def generate_defaults(count: int) -> dict[str, Any]:
        return {
            "account_id": 1,
            "contact_preference": "text",
            "last_registered": None,
            "phone_number": f"919555{count:04d}",
            "first_name": f"FStudent{count}",
            "last_name": f"LStudent{count}",
        }

    @staticmethod
    def get_sample_create_data() -> dict:
        return {"account_id": 1, "data": StudentTestUtils.get_sample_data()}

    @override
    async def next_dict(self, **overrides: Unpack[StudentOverrides]) -> dict:
        data = self.get_or_default(
            overrides,
            {"contact_preference", "last_registered", "phone_number"},
        )
        self.count += 1
        return data

    async def next_data_with_names(self, **overrides: Unpack[StudentOverrides]) -> StudentDataWithNames:
        student_data = await self.next_dict(**overrides)
        return StudentDataWithNames(
            **self.get_or_default(overrides, {"first_name", "last_name"}),
            **student_data,
        )

    async def next_student_create(self, **overrides: Unpack[StudentOverrides]) -> StudentCreate:
        if "account_id" not in overrides:
            account = await self.account_utils.create_one(
                role=AccountRole.STUDENT.value, **overrides
            )
            overrides["account_id"] = account.id

        student_data = await self.next_data_with_names(**overrides)
        return StudentCreate(account_id=overrides["account_id"], data=student_data)

    @override
    async def next_entity(self, **overrides: Unpack[StudentOverrides]) -> StudentEntity:
        student_create = await self.next_student_create(**overrides)
        return StudentEntity.from_model(student_create.data, student_create.account_id)

    # ================================ Typing Overrides ================================

    @override
    def get_or_default(
        self, overrides: StudentOverrides | None = None, fields: set[str] | None = None
    ) -> dict:
        return super().get_or_default(overrides, fields)

    @override
    async def next_data(self, **overrides: Unpack[StudentOverrides]) -> StudentData:
        return await super().next_data(**overrides)

    @override
    async def create_many(self, *, i: int, **overrides: Unpack[StudentOverrides]) -> list[StudentEntity]:
        return await super().create_many(i=i, **overrides)

    @override
    async def create_one(self, **overrides: Unpack[StudentOverrides]) -> StudentEntity:
        return await super().create_one(**overrides)
