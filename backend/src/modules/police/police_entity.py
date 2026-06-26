from datetime import datetime
from typing import ClassVar

from sqlalchemy import Boolean, CheckConstraint, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column
from sqlalchemy.sql.expression import false
from src.core.database import EntityBase
from src.core.types import UTCDateTime
from src.modules.police.police_model import PoliceAccountDto, PoliceRole


class PoliceEntity(MappedAsDataclass, EntityBase):
    """Persistence model for a police account (``police`` table).

    Stores credentials, role, email-verification state, and password-reset
    tokens. The two check constraints enforce that each token is always paired
    with its expiry column — both null or both set.
    """

    __tablename__ = "police"
    __table_args__: ClassVar[tuple] = (
        CheckConstraint(
            "(verification_token IS NULL AND verification_token_expires_at IS NULL)"
            " OR (verification_token IS NOT NULL AND verification_token_expires_at IS NOT NULL)",
            name="ck_police_verification_token_expiry_both_null_or_set",
        ),
        CheckConstraint(
            "(password_reset_token IS NULL AND password_reset_token_expires_at IS NULL)"
            " OR (password_reset_token IS NOT NULL"
            " AND password_reset_token_expires_at IS NOT NULL)",
            name="ck_police_password_reset_token_both_null_or_set",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, init=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[PoliceRole] = mapped_column(
        Enum(PoliceRole, native_enum=False, length=20),
        nullable=False,
        default=PoliceRole.OFFICER,
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=false(), default=False
    )
    verification_token: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    verification_token_expires_at: Mapped[datetime | None] = mapped_column(
        UTCDateTime, nullable=True, default=None
    )
    password_reset_token: Mapped[str | None] = mapped_column(
        String(255), nullable=True, default=None
    )
    password_reset_token_expires_at: Mapped[datetime | None] = mapped_column(
        UTCDateTime, nullable=True, default=None
    )
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, server_default=func.now(), init=False)

    def to_dto(self) -> PoliceAccountDto:
        """Convert the entity to a PoliceAccountDto."""
        return PoliceAccountDto(
            id=self.id, email=self.email, role=self.role, is_verified=self.is_verified
        )
