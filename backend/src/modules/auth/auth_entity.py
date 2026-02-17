from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column, relationship
from src.core.database import EntityBase

if TYPE_CHECKING:
    from src.modules.account.account_entity import AccountEntity


class RefreshTokenEntity(MappedAsDataclass, EntityBase):
    """
    Refresh token allow-list entity.
    Stores hashed JWT identifiers (jti) for server-side session management.
    """

    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, init=False)
    token_hash: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    account_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        default=None,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default_factory=lambda: datetime.now(UTC) + timedelta(days=7),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default_factory=lambda: datetime.now(UTC),
    )

    # Relationship to account (many-to-one)
    account: Mapped["AccountEntity | None"] = relationship(
        "AccountEntity", lazy="selectin", passive_deletes=True, init=False
    )
