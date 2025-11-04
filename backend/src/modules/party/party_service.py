import math
from datetime import datetime, timedelta
from typing import List

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import env
from src.core.database import get_session
from src.core.exceptions import ConflictException, NotFoundException

from ..address.address_entity import AddressEntity
from ..student.student_entity import StudentEntity
from .party_entity import PartyEntity
from .party_model import Party, PartyData


class PartyNotFoundException(NotFoundException):
    def __init__(self, party_id: int):
        super().__init__(f"Party with ID {party_id} not found")


class AddressNotFoundException(NotFoundException):
    def __init__(self, address_id: int):
        super().__init__(f"Address with ID {address_id} not found")


class StudentNotFoundException(NotFoundException):
    def __init__(self, student_id: int):
        super().__init__(f"Student with ID {student_id} not found")


class PartyConflictException(ConflictException):
    def __init__(self, message: str):
        super().__init__(message)


class PartyService:
    def __init__(self, session: AsyncSession = Depends(get_session)):
        self.session = session

    async def _get_party_entity_by_id(self, party_id: int) -> PartyEntity:
        result = await self.session.execute(
            select(PartyEntity).where(PartyEntity.id == party_id)
        )
        party_entity = result.scalar_one_or_none()
        if party_entity is None:
            raise PartyNotFoundException(party_id)
        return party_entity

    async def _validate_address_exists(self, address_id: int) -> None:
        result = await self.session.execute(
            select(AddressEntity).where(AddressEntity.id == address_id)
        )
        if result.scalar_one_or_none() is None:
            raise AddressNotFoundException(address_id)

    async def _validate_student_exists(self, student_id: int) -> None:
        result = await self.session.execute(
            select(StudentEntity).where(StudentEntity.account_id == student_id)
        )
        if result.scalar_one_or_none() is None:
            raise StudentNotFoundException(student_id)

    async def get_parties(self, skip: int = 0, limit: int = 100) -> List[Party]:
        result = await self.session.execute(
            select(PartyEntity).offset(skip).limit(limit)
        )
        parties = result.scalars().all()
        return [party.to_model() for party in parties]

    async def get_party_by_id(self, party_id: int) -> Party:
        party_entity = await self._get_party_entity_by_id(party_id)
        return party_entity.to_model()

    async def get_parties_by_address(self, address_id: int) -> List[Party]:
        result = await self.session.execute(
            select(PartyEntity).where(PartyEntity.address_id == address_id)
        )
        parties = result.scalars().all()
        return [party.to_model() for party in parties]

    async def get_parties_by_contact(self, student_id: int) -> List[Party]:
        result = await self.session.execute(
            select(PartyEntity).where(
                (PartyEntity.contact_one_id == student_id)
                | (PartyEntity.contact_two_id == student_id)
            )
        )
        parties = result.scalars().all()
        return [party.to_model() for party in parties]

    async def get_parties_by_date_range(
        self, start_date: datetime, end_date: datetime
    ) -> List[Party]:
        result = await self.session.execute(
            select(PartyEntity).where(
                PartyEntity.party_datetime >= start_date,
                PartyEntity.party_datetime <= end_date,
            )
        )
        parties = result.scalars().all()
        return [party.to_model() for party in parties]

    async def create_party(self, data: PartyData) -> Party:
        # Validate that referenced resources exist
        await self._validate_address_exists(data.address_id)
        await self._validate_student_exists(data.contact_one_id)
        await self._validate_student_exists(data.contact_two_id)

        new_party = PartyEntity.from_model(data)
        try:
            self.session.add(new_party)
            await self.session.commit()
        except IntegrityError as e:
            raise PartyConflictException(f"Failed to create party: {str(e)}")
        await self.session.refresh(new_party)
        return new_party.to_model()

    async def update_party(self, party_id: int, data: PartyData) -> Party:
        party_entity = await self._get_party_entity_by_id(party_id)

        # Validate that referenced resources exist
        await self._validate_address_exists(data.address_id)
        await self._validate_student_exists(data.contact_one_id)
        await self._validate_student_exists(data.contact_two_id)

        for key, value in data.model_dump().items():
            if key == "id":
                continue
            if hasattr(party_entity, key):
                setattr(party_entity, key, value)

        try:
            self.session.add(party_entity)
            await self.session.commit()
        except IntegrityError as e:
            raise PartyConflictException(f"Failed to update party: {str(e)}")
        await self.session.refresh(party_entity)
        return party_entity.to_model()

    async def delete_party(self, party_id: int) -> Party:
        party_entity = await self._get_party_entity_by_id(party_id)
        party = party_entity.to_model()
        await self.session.delete(party_entity)
        await self.session.commit()
        return party

    async def party_exists(self, party_id: int) -> bool:
        result = await self.session.execute(
            select(PartyEntity).where(PartyEntity.id == party_id)
        )
        return result.scalar_one_or_none() is not None

    async def get_party_count(self) -> int:
        result = await self.session.execute(select(PartyEntity))
        parties = result.scalars().all()
        return len(parties)

    async def get_parties_by_student_and_date(
        self, student_id: int, target_date: datetime
    ) -> List[Party]:
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(
            hour=23, minute=59, second=59, microsecond=999999
        )

        result = await self.session.execute(
            select(PartyEntity).where(
                (
                    (PartyEntity.contact_one_id == student_id)
                    | (PartyEntity.contact_two_id == student_id)
                ),
                PartyEntity.party_datetime >= start_of_day,
                PartyEntity.party_datetime <= end_of_day,
            )
        )
        parties = result.scalars().all()
        return [party.to_model() for party in parties]

    async def get_parties_by_radius(
        self, latitude: float, longitude: float
    ) -> List[Party]:
        current_time = datetime.now()
        start_time = current_time - timedelta(hours=6)
        end_time = current_time + timedelta(hours=12)

        result = await self.session.execute(
            select(PartyEntity).where(
                PartyEntity.party_datetime >= start_time,
                PartyEntity.party_datetime <= end_time,
            )
        )
        parties = result.scalars().all()

        parties_within_radius = []
        for party in parties:
            address_result = await self.session.execute(
                select(AddressEntity).where(AddressEntity.id == party.address_id)
            )
            address = address_result.scalar_one_or_none()

            if address is None:
                continue

            distance = self._calculate_haversine_distance(
                latitude, longitude, float(address.latitude), float(address.longitude)
            )

            if distance <= env.PARTY_SEARCH_RADIUS_MILES:
                parties_within_radius.append(party)

        return [party.to_model() for party in parties_within_radius]

    def _calculate_haversine_distance(
        self, lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.asin(math.sqrt(a))

        r = 3959
        return c * r
