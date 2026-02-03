from typing import Self

from sqlalchemy import CheckConstraint, Enum, Index, Integer, String, text
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column
from src.core.database import EntityBase
from src.modules.account.account_model import AccountData, AccountDto, AccountRole


class AccountEntity(MappedAsDataclass, EntityBase):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, init=False)
    email: Mapped[str] = mapped_column(String, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    pid: Mapped[str] = mapped_column(
        String(9),
        CheckConstraint(
            "length(pid) = 9 AND pid ~ '^[0-9]{9}$'",
            name="check_pid_format",
        ),
        unique=True,
        index=True,
        nullable=False,
    )
    role: Mapped[AccountRole] = mapped_column(Enum(AccountRole), nullable=False)

    # Create case-insensitive unique index for email using text expression
    __table_args__ = (Index("ix_accounts_email_lower", text("lower(email)"), unique=True),)

    @classmethod
    def from_data(cls, data: "AccountData") -> Self:
        return cls(
            email=data.email,
            first_name=data.first_name,
            last_name=data.last_name,
            pid=data.pid,
            role=AccountRole(data.role),
        )

    def to_dto(self) -> "AccountDto":
        return AccountDto(
            id=self.id,
            email=self.email,
            first_name=self.first_name,
            last_name=self.last_name,
            pid=self.pid,
            role=self.role,
        )
