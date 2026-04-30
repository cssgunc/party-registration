from datetime import UTC, datetime, timedelta

from sqlalchemy import Enum, Integer, String
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column
from src.core.config import env
from src.core.database import EntityBase
from src.core.types import UTCDateTime
from src.modules.account.account_model import CreateInviteDto, InviteTokenRole


class InviteTokenEntity(MappedAsDataclass, EntityBase):
    __tablename__ = "invite_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, init=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    role: Mapped[InviteTokenRole] = mapped_column(
        Enum(InviteTokenRole, native_enum=False, length=20), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)

    @classmethod
    def from_data(cls, data: CreateInviteDto):
        expires_at = datetime.now(UTC) + timedelta(hours=env.INVITE_TOKEN_EXPIRY_HOURS)
        return cls(
            email=data.email,
            role=InviteTokenRole(data.role.value),
            expires_at=expires_at,
        )

    def is_expired(self, current_time: datetime) -> bool:
        return current_time >= self.expires_at
