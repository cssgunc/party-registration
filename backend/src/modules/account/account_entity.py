from datetime import datetime
from typing import Self

from sqlalchemy import CheckConstraint, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column
from src.core.database import EntityBase
from src.core.types import UTCDateTime
from src.modules.account.account_model import AccountData, AccountDto, AccountRole
from src.modules.student.student_model import StudentDto, StudentSelfDto


class AccountEntity(MappedAsDataclass, EntityBase):
    """Persistence model for a UNC-identity account (``accounts`` table).

    Stores staff, admin, and student accounts that authenticate via the UNC IdP.
    ``pid`` and ``onyen`` are unique identifiers from the identity provider;
    a CHECK constraint enforces the 9-digit PID format at the DB level.
    """

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
        """Build an unsaved entity from an `AccountData` DTO."""
        return cls(
            email=data.email,
            first_name=data.first_name,
            last_name=data.last_name,
            pid=data.pid,
            onyen=data.onyen,
            role=AccountRole(data.role),
        )

    def to_dto(self) -> AccountDto:
        """Convert entity to full account DTO."""
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
        """Convert entity to a student DTO with no student-profile fields set.

        Student-profile fields (``phone_number``, ``contact_preference``,
        ``last_registered``, ``residence``) are ``None`` because those live on
        ``StudentEntity``, not ``AccountEntity``.
        """
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

    def to_student_self_dto(self) -> StudentSelfDto:
        """Convert entity to a student self-view DTO."""
        dto = self.to_student_dto()
        return StudentSelfDto(**dto.model_dump())
