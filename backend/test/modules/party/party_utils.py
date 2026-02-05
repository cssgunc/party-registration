from datetime import UTC, datetime, timedelta
from typing import Any, TypedDict, Unpack, override

from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.party.party_entity import PartyEntity
from src.modules.party.party_model import (
    AdminCreatePartyDto,
    ContactDto,
    PartyData,
    PartyDto,
    StudentCreatePartyDto,
)
from src.modules.student.student_model import ContactPreference
from test.modules.location.location_utils import LocationTestUtils
from test.modules.student.student_utils import StudentTestUtils
from test.utils.resource_test_utils import ResourceTestUtils


def get_valid_party_datetime() -> datetime:
    """Get a datetime that is at least 3 business days from now."""
    days_ahead = 5  # Start with 5 calendar days to ensure 3 business days
    return datetime.now(UTC) + timedelta(days=days_ahead)


class PartyOverrides(TypedDict, total=False):
    party_datetime: datetime
    location_id: int
    contact_one_id: int
    google_place_id: str
    contact_one_email: str
    contact_two: ContactDto
    contact_two_email: str
    contact_two_first_name: str
    contact_two_last_name: str
    contact_two_phone_number: str
    contact_two_contact_preference: ContactPreference


class PartyTestUtils(
    ResourceTestUtils[
        PartyEntity,
        PartyData,
        PartyDto,
    ]
):
    def __init__(
        self,
        session: AsyncSession,
        location_utils: LocationTestUtils,
        student_utils: StudentTestUtils,
    ):
        super().__init__(
            session,
            entity_class=PartyEntity,
            data_class=PartyData,
        )
        self.location_utils = location_utils
        self.student_utils = student_utils

    @override
    @staticmethod
    def generate_defaults(count: int) -> dict[str, Any]:
        return {
            "location_id": 1,
            "contact_one_id": 1,
            "party_datetime": get_valid_party_datetime() + timedelta(days=count),
            "contact_two_email": f"contact{count}@email.com",
            "contact_two_first_name": f"ContactTwo{count}",
            "contact_two_last_name": f"LastName{count}",
            "contact_two_phone_number": f"919555{1000 + count:04d}",
            "contact_two_contact_preference": "text",
        }

    @override
    async def next_dict(self, **overrides: Unpack[PartyOverrides]) -> dict:
        # Create a copy to avoid mutating the original
        local_overrides = dict(overrides)

        if "location_id" not in local_overrides:
            location = await self.location_utils.create_one()
            local_overrides["location_id"] = location.id

        if "contact_one_id" not in local_overrides:
            student = await self.student_utils.create_one()
            local_overrides["contact_one_id"] = student.account_id

        return await super().next_dict(**local_overrides)

    def next_contact(self, **overrides: Unpack[PartyOverrides]) -> ContactDto:
        """Generate test contact data."""
        defaults = self.generate_defaults(self.count)
        return ContactDto(
            email=overrides.get("contact_two_email", defaults["contact_two_email"]),
            first_name=overrides.get("contact_two_first_name", defaults["contact_two_first_name"]),
            last_name=overrides.get("contact_two_last_name", defaults["contact_two_last_name"]),
            phone_number=overrides.get(
                "contact_two_phone_number", defaults["contact_two_phone_number"]
            ),
            contact_preference=overrides.get(
                "contact_two_contact_preference", defaults["contact_two_contact_preference"]
            ),
        )

    @override
    async def next_data(self, **overrides: Unpack[PartyOverrides]) -> PartyData:
        data = await self.next_dict(**overrides)
        contact_two = self.next_contact(**overrides)
        return PartyData(
            party_datetime=data["party_datetime"],
            location_id=data["location_id"],
            contact_one_id=data["contact_one_id"],
            contact_two=contact_two,
        )

    async def next_admin_create_dto(
        self, **overrides: Unpack[PartyOverrides]
    ) -> AdminCreatePartyDto:
        """Generate an AdminCreatePartyDTO for testing."""
        if "google_place_id" not in overrides:
            location = await self.location_utils.create_one()
            overrides["google_place_id"] = location.google_place_id

        if "contact_one_email" not in overrides:
            student = await self.student_utils.create_one()
            student_dto = await student.load_dto(self.student_utils.session)
            overrides["contact_one_email"] = student_dto.email

        return AdminCreatePartyDto(
            type="admin",
            party_datetime=overrides.get("party_datetime", get_valid_party_datetime()),
            google_place_id=overrides["google_place_id"],
            contact_one_email=overrides["contact_one_email"],
            contact_two=overrides.get("contact_two", self.next_contact()),
        )

    async def next_student_create_dto(
        self, **overrides: Unpack[PartyOverrides]
    ) -> StudentCreatePartyDto:
        """Generate a StudentCreatePartyDTO for testing."""
        if "google_place_id" not in overrides:
            location = await self.location_utils.create_one()
            overrides["google_place_id"] = location.google_place_id

        return StudentCreatePartyDto(
            type="student",
            party_datetime=overrides.get("party_datetime", get_valid_party_datetime()),
            google_place_id=overrides["google_place_id"],
            contact_two=overrides.get("contact_two", self.next_contact()),
        )

    @override
    def assert_matches(
        self,
        resource1: PartyEntity | PartyData | PartyDto | None,
        resource2: PartyEntity | PartyData | PartyDto | None,
    ) -> None:
        """Assert that two party resources match, with special handling for nested objects."""
        assert resource1 is not None, "First party is None"
        assert resource2 is not None, "Second party is None"

        # Handle datetime comparison with timezone awareness
        dt1 = resource1.party_datetime
        dt2 = resource2.party_datetime

        if dt1.tzinfo is None:
            dt1 = dt1.replace(tzinfo=UTC)
        if dt2.tzinfo is None:
            dt2 = dt2.replace(tzinfo=UTC)

        assert dt1 == dt2, f"Party datetime mismatch: {dt1} != {dt2}"

        # Compare location
        location_id_1, location_id_2 = [
            party.location.id if isinstance(party, PartyDto) else party.location_id
            for party in (resource1, resource2)
        ]

        assert location_id_1 == location_id_2, (
            f"Location ID mismatch: {location_id_1} != {location_id_2}"
        )

        if isinstance(resource1, PartyDto) and isinstance(resource2, PartyDto):
            self.location_utils.assert_matches(resource1.location, resource2.location)

        # Compare contact_one
        contact_one_id_1, contact_one_id_2 = [
            party.contact_one.id if isinstance(party, PartyDto) else party.contact_one_id
            for party in (resource1, resource2)
        ]

        assert contact_one_id_1 == contact_one_id_2, (
            f"Contact one ID mismatch: {contact_one_id_1} != {contact_one_id_2}"
        )

        if isinstance(resource1, PartyDto) and isinstance(resource2, PartyDto):
            self.student_utils.assert_matches(resource1.contact_one, resource2.contact_one)

        # Compare contact_two fields
        contact_two_1, contact_two_2 = [
            (
                party.contact_two
                if not isinstance(party, PartyEntity)
                else ContactDto(
                    email=party.contact_two_email,
                    first_name=party.contact_two_first_name,
                    last_name=party.contact_two_last_name,
                    phone_number=party.contact_two_phone_number,
                    contact_preference=party.contact_two_contact_preference,
                )
            )
            for party in (resource1, resource2)
        ]

        assert contact_two_1.model_dump() == contact_two_2.model_dump(), (
            f"Contact two mismatch: {contact_two_1} != {contact_two_2}"
        )

        # Check ID when both have them
        if not isinstance(resource1, PartyData) and not isinstance(resource2, PartyData):
            assert resource1.id is not None, "First party ID is None"
            assert resource2.id is not None, "Second party ID is None"
            assert resource1.id == resource2.id, f"ID mismatch: {resource1.id} != {resource2.id}"

    # ================================ Typing Overrides ================================

    @override
    def get_or_default(
        self, overrides: PartyOverrides | None = None, fields: set[str] | None = None
    ) -> dict:
        return super().get_or_default(overrides, fields)

    @override
    async def next_entity(self, **overrides: Unpack[PartyOverrides]) -> PartyEntity:
        return await super().next_entity(**overrides)

    @override
    async def create_many(
        self, *, i: int, **overrides: Unpack[PartyOverrides]
    ) -> list[PartyEntity]:
        return await super().create_many(i=i, **overrides)

    @override
    async def create_one(self, **overrides: Unpack[PartyOverrides]) -> PartyEntity:
        return await super().create_one(**overrides)
