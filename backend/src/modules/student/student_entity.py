from datetime import UTC, datetime
from typing import TYPE_CHECKING, Self

from sqlalchemy import CheckConstraint, Enum, ForeignKey, Integer, String, select
from sqlalchemy.dialects.mssql import DATETIMEOFFSET
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, MappedAsDataclass, mapped_column, relationship, selectinload
from src.core.database import EntityBase

from .student_model import ContactPreference, StudentData, StudentDto

if TYPE_CHECKING:
    from src.modules.account.account_entity import AccountEntity
    from src.modules.location.location_entity import LocationEntity


class StudentEntity(MappedAsDataclass, EntityBase):
    __tablename__ = "students"

    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("accounts.id"), primary_key=True, autoincrement=False, index=True
    )
    contact_preference: Mapped[ContactPreference] = mapped_column(
        Enum(ContactPreference, native_enum=False, length=20), nullable=False
    )
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    last_registered: Mapped[datetime | None] = mapped_column(
        DATETIMEOFFSET, nullable=True, default=None
    )
    residence_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("locations.id"), nullable=True, default=None
    )
    residence_chosen_date: Mapped[datetime | None] = mapped_column(
        DATETIMEOFFSET, nullable=True, default=None
    )

    account: Mapped["AccountEntity"] = relationship("AccountEntity", init=False)
    residence: Mapped["LocationEntity | None"] = relationship(
        "LocationEntity", foreign_keys=[residence_id], init=False
    )

    __table_args__ = (
        CheckConstraint(
            "(last_registered IS NULL AND residence_id IS NULL "
            "AND residence_chosen_date IS NULL) OR (last_registered IS NOT NULL)",
            name="chk_no_residence_if_never_registered",
        ),
        CheckConstraint(
            "(residence_id IS NULL AND residence_chosen_date IS NULL) OR "
            "(residence_id IS NOT NULL AND residence_chosen_date IS NOT NULL)",
            name="chk_residence_consistency",
        ),
    )

    @classmethod
    def from_data(
        cls, data: "StudentData", account_id: int, residence_id: int | None = None
    ) -> Self:
        return cls(
            contact_preference=data.contact_preference,
            last_registered=data.last_registered,
            phone_number=data.phone_number,
            account_id=account_id,
            residence_id=residence_id,
            residence_chosen_date=datetime.now(UTC) if residence_id is not None else None,
        )

    def to_dto(self) -> "StudentDto":
        """Convert entity to DTO using the account relationship."""
        # Ensure last_registered is timezone-aware if present
        last_reg = self.last_registered
        if last_reg is not None and last_reg.tzinfo is None:
            last_reg = last_reg.replace(tzinfo=UTC)

        # Ensure residence_chosen_date is timezone-aware if present
        residence_chosen = self.residence_chosen_date
        if residence_chosen is not None and residence_chosen.tzinfo is None:
            residence_chosen = residence_chosen.replace(tzinfo=UTC)

        # Create ResidenceDto if residence is present
        from .student_model import ResidenceDto

        residence_dto = None
        if (
            self.residence_id is not None
            and self.residence is not None
            and residence_chosen is not None
        ):
            residence_dto = ResidenceDto(
                location=self.residence.to_dto(),
                residence_chosen_date=residence_chosen,
            )

        return StudentDto(
            id=self.account_id,
            pid=self.account.pid,
            email=self.account.email,
            first_name=self.account.first_name,
            last_name=self.account.last_name,
            onyen=self.account.onyen,
            phone_number=self.phone_number,
            contact_preference=self.contact_preference,
            last_registered=last_reg,
            residence=residence_dto,
        )

    async def load_dto(self, session: AsyncSession) -> StudentDto:
        """
        Load student with account relationship from database and convert to DTO.
        Should be used to get the DTO only if the account relationship hasn't been loaded yet.
        """
        result = await session.execute(
            select(self.__class__)
            .where(self.__class__.account_id == self.account_id)
            .options(selectinload(self.__class__.account), selectinload(self.__class__.residence))
        )
        student_entity = result.scalar_one()
        return student_entity.to_dto()
