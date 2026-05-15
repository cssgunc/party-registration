from datetime import datetime
from typing import Self

from sqlalchemy import CheckConstraint, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column
from src.core.database import EntityBase
from src.core.types import UTCDateTime
from src.modules.account.account_model import AccountData, AccountDto, AccountRole
from src.modules.student.student_model import StudentDto


class AccountEntity(MappedAsDataclass, EntityBase):
    __tablename__ = "accounts"
    __table_args__ = (
        CheckConstraint(
            "CHAR_LENGTH(pid) = 9 AND pid REGEXP '^[0-9]+$'",
            name="check_pid_format",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, init=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    pid: Mapped[str] = mapped_column(
        String(9),
        unique=True,
        index=True,
        nullable=False,
    )
    onyen: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    role: Mapped[AccountRole] = mapped_column(
        Enum(AccountRole, native_enum=False, length=20), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now(), init=False)

    @classmethod
    def from_data(cls, data: AccountData) -> Self:
        return cls(
            email=data.email,
            first_name=data.first_name,
            last_name=data.last_name,
            pid=data.pid,
            onyen=data.onyen,
            role=AccountRole(data.role),
        )

    def to_dto(self) -> AccountDto:
        return AccountDto(
            id=self.id,
            email=self.email,
            first_name=self.first_name,
            last_name=self.last_name,
            pid=self.pid,
            onyen=self.onyen,
            role=self.role,
        )

    def to_student_dto(self) -> StudentDto:
        return StudentDto(
            id=self.id,
            pid=self.pid,
            email=self.email,
            first_name=self.first_name,
            last_name=self.last_name,
            onyen=self.onyen,
            phone_number=None,
            contact_preference=None,
            last_registered=None,
            residence=None,
        )
