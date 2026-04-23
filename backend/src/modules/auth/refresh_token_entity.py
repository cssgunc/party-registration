from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column, relationship
from src.core.config import env
from src.core.database import EntityBase
from src.core.types import UTCDateTime

if TYPE_CHECKING:
    from src.modules.account.account_entity import AccountEntity
    from src.modules.police.police_entity import PoliceEntity


class RefreshTokenEntity(MappedAsDataclass, EntityBase):
    """
    Refresh token allow-list entity.
    Stores hashed JWT identifiers (jti) for server-side session management.
    Exactly one of account_id or police_id must be non-null.
    """

    __tablename__ = "refresh_tokens"
    __table_args__ = (
        CheckConstraint(
            "(account_id IS NULL AND police_id IS NOT NULL)"
            " OR (account_id IS NOT NULL AND police_id IS NULL)",
            name="refresh_token_owner_check",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, init=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    account_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        default=None,
    )
    police_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("police.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        default=None,
    )
    expires_at: Mapped[datetime] = mapped_column(
        UTCDateTime,
        nullable=False,
        default_factory=lambda: datetime.now(UTC) + timedelta(days=env.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime,
        nullable=False,
        default_factory=lambda: datetime.now(UTC),
    )

    # Relationships
    account: Mapped["AccountEntity | None"] = relationship(
        "AccountEntity", lazy="selectin", passive_deletes=True, init=False
    )
    police: Mapped["PoliceEntity | None"] = relationship(
        "PoliceEntity", lazy="selectin", passive_deletes=True, init=False
    )
