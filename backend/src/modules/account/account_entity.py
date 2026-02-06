from typing import Self

from sqlalchemy import CheckConstraint, Enum, Integer, String
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column
from src.core.database import EntityBase
from src.modules.account.account_model import AccountData, AccountDto, AccountRole


class AccountEntity(MappedAsDataclass, EntityBase):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, init=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    pid: Mapped[str] = mapped_column(
        String(9),
        CheckConstraint(
            "LEN(pid) = 9 AND pid NOT LIKE '%[^0-9]%'",
            name="check_pid_format",
        ),
        nullable=False,
    )
    onyen: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    role: Mapped[AccountRole] = mapped_column(
        Enum(AccountRole, native_enum=False, length=20), nullable=False
    )

    @classmethod
    def from_data(cls, data: "AccountData") -> Self:
        return cls(
            email=data.email,
            first_name=data.first_name,
            last_name=data.last_name,
            pid=data.pid,
            onyen=data.onyen,
            role=AccountRole(data.role),
        )

    def to_dto(self) -> "AccountDto":
        return AccountDto(
            id=self.id,
            email=self.email,
            first_name=self.first_name,
            last_name=self.last_name,
            pid=self.pid,
            onyen=self.onyen,
            role=self.role,
        )
