import csv
from datetime import datetime, timedelta
from unittest.mock import MagicMock

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.account.account_service import AccountService
from src.modules.location.location_entity import LocationEntity
from src.modules.location.location_service import (
    LocationNotFoundException,
    LocationService,
)
from src.modules.party.party_entity import PartyEntity
from src.modules.party.party_model import Contact, Party, PartyData
from src.modules.party.party_service import (
    PartyNotFoundException,
    PartyService,
    StudentNotFoundException,
    StudentService,
)
from src.modules.student.student_entity import StudentEntity
from src.modules.student.student_model import ContactPreference


@pytest_asyncio.fixture
async def mock_gmaps_client() -> MagicMock:
    """Create a mock Google Maps client"""
    return MagicMock()


@pytest_asyncio.fixture()
async def mock_location_service(
    test_async_session: AsyncSession, mock_gmaps_client: MagicMock
) -> LocationService:
    return LocationService(session=test_async_session, gmaps_client=mock_gmaps_client)


@pytest_asyncio.fixture()
async def party_service(
    test_async_session: AsyncSession, mock_location_service: LocationService
) -> PartyService:
    return PartyService(
        session=test_async_session,
        account_service=AccountService(test_async_session),
        student_service=StudentService(test_async_session),
        location_service=mock_location_service,
    )


@pytest_asyncio.fixture()
async def sample_party_data(test_async_session: AsyncSession) -> PartyData:
    # Create location
    location = LocationEntity(
        id=1,
        latitude=40.7128,
        longitude=-74.0060,
        google_place_id="test_place_id_1",
        formatted_address="123 Test St, Test City, TC 12345",
    )
    test_async_session.add(location)

    # Create account for students
    account_one = AccountEntity(
        id=1,
        email="test@example.com",
        first_name="Test",
        last_name="User",
        pid="300000001",
        role=AccountRole.STUDENT,
    )
    account_two = AccountEntity(
        id=2,
        email="test2@example.com",
        first_name="Test",
        last_name="User",
        pid="300000001",
        role=AccountRole.STUDENT,
    )
    test_async_session.add_all([account_one, account_two])

    # Create students
    student_one = StudentEntity(
        contact_preference=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,
    )
    student_two = StudentEntity(
        contact_preference=ContactPreference.text,
        phone_number="0987654321",
        account_id=2,
    )
    test_async_session.add_all([student_one, student_two])
    await test_async_session.commit()

    return PartyData(
        party_datetime=datetime.now() + timedelta(days=1),
        location_id=1,
        contact_one_id=1,
        contact_two=Contact(
            email="test2@example.com",
            first_name="Jane",
            last_name="Smith",
            phone_number="0987654321",
            contact_preference=ContactPreference.text,
        ),
    )


@pytest_asyncio.fixture()
async def party_in_db(
    test_async_session: AsyncSession, sample_party_data: PartyData
) -> Party:
    """Create a party directly in the database, bypassing the service layer."""

    party_entity = PartyEntity(
        party_datetime=sample_party_data.party_datetime,
        location_id=sample_party_data.location_id,
        contact_one_id=sample_party_data.contact_one_id,
        contact_two_email=sample_party_data.contact_two.email,
        contact_two_first_name=sample_party_data.contact_two.first_name,
        contact_two_last_name=sample_party_data.contact_two.last_name,
        contact_two_phone_number=sample_party_data.contact_two.phone_number,
        contact_two_contact_preference=sample_party_data.contact_two.contact_preference,
    )
    test_async_session.add(party_entity)
    await test_async_session.commit()

    return await party_entity.load_model(test_async_session)


@pytest_asyncio.fixture()
async def multiple_parties_in_db(
    test_async_session: AsyncSession, sample_party_data: PartyData
):
    """Create multiple parties directly in the database for testing."""

    parties = []

    for days_offset in [1, 2, 5]:
        party_entity = PartyEntity(
            party_datetime=datetime.now() + timedelta(days=days_offset),
            location_id=sample_party_data.location_id,
            contact_one_id=sample_party_data.contact_one_id,
            contact_two_email=sample_party_data.contact_two.email,
            contact_two_first_name=sample_party_data.contact_two.first_name,
            contact_two_last_name=sample_party_data.contact_two.last_name,
            contact_two_phone_number=sample_party_data.contact_two.phone_number,
            contact_two_contact_preference=sample_party_data.contact_two.contact_preference,
        )
        test_async_session.add(party_entity)
        parties.append(party_entity)

    await test_async_session.commit()

    party_ids = [p.id for p in parties]
    result = await test_async_session.execute(
        select(PartyEntity)
        .where(PartyEntity.id.in_(party_ids))
        .options(
            selectinload(PartyEntity.location),
            selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
        )
    )
    parties = result.scalars().all()

    return [party.to_model() for party in parties]


@pytest_asyncio.fixture()
async def radius_test_accounts_and_students(
    test_async_session: AsyncSession,
):
    """Create accounts and students for radius tests."""
    accounts = []
    students = []
    for i in range(1, 7):  # Create 6 students
        account = AccountEntity(
            id=i,
            email=f"student{i}@example.com",
            first_name="Test",
            last_name="User",
            pid="300000001",
            role=AccountRole.STUDENT,
        )
        accounts.append(account)

        student = StudentEntity(
            account_id=i,
            contact_preference=ContactPreference.call
            if i % 2 == 1
            else ContactPreference.text,
            phone_number=str(i) * 10,
        )
        students.append(student)

    test_async_session.add_all(accounts + students)
    await test_async_session.commit()

    return {"accounts": accounts, "students": students}


@pytest_asyncio.fixture()
async def parties_with_radius_addresses(
    test_async_session: AsyncSession, radius_test_accounts_and_students: dict
):
    """Create parties at different coordinates for radius testing."""
    from src.modules.party.party_entity import PartyEntity

    search_lat = 40.7128
    search_lon = -74.0060

    # Address 1: ~0.2 miles away (within 0.25 mile radius)
    # At latitude 40.7128, 1 degree ≈ 111 km, so 0.25 miles ≈ 0.0036 degrees
    address1 = LocationEntity(
        id=1,
        latitude=search_lat + 0.002,
        longitude=search_lon,
        google_place_id="test_place_radius_1",
        formatted_address="Test Address 1",
    )
    test_async_session.add(address1)

    party1 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=2),
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(party1)

    # Address 2: ~0.15 miles away (within 0.25 mile radius)
    address2 = LocationEntity(
        id=2,
        latitude=search_lat - 0.0015,
        longitude=search_lon,
        google_place_id="test_place_radius_2",
        formatted_address="Test Address 2",
    )
    test_async_session.add(address2)

    party2 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=4),
        location_id=2,
        contact_one_id=3,
        contact_two_email="test4@example.com",
        contact_two_first_name="Contact",
        contact_two_last_name="Four",
        contact_two_phone_number="4444444444",
        contact_two_contact_preference=ContactPreference.call,
    )
    test_async_session.add(party2)

    # Address 3: ~0.5 miles away (outside 0.25 mile radius)
    address3 = LocationEntity(
        id=3,
        latitude=search_lat + 0.005,
        longitude=search_lon,
        google_place_id="test_place_radius_3",
        formatted_address="Test Address 3",
    )
    test_async_session.add(address3)

    party3 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=6),
        location_id=3,
        contact_one_id=5,
        contact_two_email="test6@example.com",
        contact_two_first_name="Contact",
        contact_two_last_name="Six",
        contact_two_phone_number="6666666666",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(party3)

    await test_async_session.commit()

    party_ids = [party1.id, party2.id, party3.id]
    result = await test_async_session.execute(
        select(PartyEntity)
        .where(PartyEntity.id.in_(party_ids))
        .options(
            selectinload(PartyEntity.location),
            selectinload(PartyEntity.contact_one).selectinload(StudentEntity.account),
        )
    )
    parties = {p.id: p for p in result.scalars().all()}

    return {
        "party1": parties[party1.id].to_model(),
        "party2": parties[party2.id].to_model(),
        "party3": parties[party3.id].to_model(),
        "address1": address1,
        "address2": address2,
        "address3": address3,
    }


@pytest.mark.asyncio
async def test_create_party(
    party_service: PartyService, sample_party_data: PartyData
) -> None:
    party = await party_service.create_party(sample_party_data)
    assert party is not None
    assert party.id is not None
    assert party.party_datetime == sample_party_data.party_datetime
    assert party.location.id == sample_party_data.location_id
    assert party.contact_one.id == sample_party_data.contact_one_id
    assert party.contact_two.email == sample_party_data.contact_two.email


@pytest.mark.asyncio
async def test_create_party_invalid_location(
    party_service: PartyService, sample_party_data: PartyData
) -> None:
    invalid_data = PartyData(
        party_datetime=sample_party_data.party_datetime,
        location_id=999,  # Non-existent location
        contact_one_id=sample_party_data.contact_one_id,
        contact_two=sample_party_data.contact_two,
    )
    with pytest.raises(LocationNotFoundException):
        await party_service.create_party(invalid_data)


@pytest.mark.asyncio
async def test_create_party_invalid_contact_one(
    party_service: PartyService, sample_party_data: PartyData
) -> None:
    invalid_data = PartyData(
        party_datetime=sample_party_data.party_datetime,
        location_id=sample_party_data.location_id,
        contact_one_id=999,  # Non-existent student
        contact_two=sample_party_data.contact_two,
    )
    with pytest.raises(StudentNotFoundException):
        await party_service.create_party(invalid_data)


# Test removed: contact_two is no longer validated as a student
# Contact two is stored as contact information, not as a foreign key to students


@pytest.mark.asyncio
async def test_get_parties(
    party_service: PartyService, test_async_session: AsyncSession
):
    # Create account, locations and students for parties

    account1 = AccountEntity(
        id=1,
        email="student1@example.com",
        first_name="Test",
        last_name="User",
        pid="300000001",
        role=AccountRole.STUDENT,
    )

    account2 = AccountEntity(
        id=2,
        email="student2@example.com",
        first_name="Test",
        last_name="User",
        pid="300000001",
        role=AccountRole.STUDENT,
    )

    account3 = AccountEntity(
        id=3,
        email="admin@example.com",
        first_name="Test",
        last_name="User",
        pid="300000001",
        role=AccountRole.ADMIN,
    )

    account4 = AccountEntity(
        id=4,
        email="police@example.com",
        first_name="Test",
        last_name="User",
        pid="300000001",
        role=AccountRole.STAFF,
    )

    address1 = LocationEntity(
        id=1,
        latitude=40.7128,
        longitude=-74.0060,
        google_place_id="test_place_1",
        formatted_address="NYC Test Address",
    )
    address2 = LocationEntity(
        id=2,
        latitude=34.0522,
        longitude=-118.2437,
        google_place_id="test_place_2",
        formatted_address="LA Test Address",
    )
    student1 = StudentEntity(
        contact_preference=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,
    )
    student2 = StudentEntity(
        contact_preference=ContactPreference.text,
        phone_number="0987654321",
        account_id=2,
    )
    student3 = StudentEntity(
        contact_preference=ContactPreference.call,
        phone_number="1111111111",
        account_id=3,
    )
    student4 = StudentEntity(
        contact_preference=ContactPreference.text,
        phone_number="2222222222",
        account_id=4,
    )
    test_async_session.add_all(
        [
            account1,
            account2,
            account3,
            account4,
            address1,
            address2,
            student1,
            student2,
            student3,
            student4,
        ]
    )
    await test_async_session.commit()

    # Create multiple parties directly in the database
    party1 = PartyEntity(
        party_datetime=datetime.now() + timedelta(days=1),
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    party2 = PartyEntity(
        party_datetime=datetime.now() + timedelta(days=2),
        location_id=2,
        contact_one_id=3,
        contact_two_email="test4@example.com",
        contact_two_first_name="Contact",
        contact_two_last_name="Four",
        contact_two_phone_number="4444444444",
        contact_two_contact_preference=ContactPreference.call,
    )
    test_async_session.add_all([party1, party2])
    await test_async_session.commit()
    await test_async_session.refresh(party1)
    await test_async_session.refresh(party2)

    parties = await party_service.get_parties()
    assert len(parties) == 2
    party_ids = [p.id for p in parties]
    assert party1.id in party_ids
    assert party2.id in party_ids


@pytest.mark.asyncio
async def test_get_party_by_id(party_service: PartyService, party_in_db: Party):
    fetched = await party_service.get_party_by_id(party_in_db.id)
    assert party_in_db.id == fetched.id
    assert party_in_db.party_datetime == fetched.party_datetime
    assert party_in_db.location.id == fetched.location.id


@pytest.mark.asyncio
async def test_get_party_by_id_not_found(party_service: PartyService):
    with pytest.raises(PartyNotFoundException):
        await party_service.get_party_by_id(999)


@pytest.mark.asyncio
async def test_get_parties_by_location(party_service: PartyService, party_in_db: Party):
    parties = await party_service.get_parties_by_location(party_in_db.location.id)
    assert len(parties) == 1
    assert parties[0].id == party_in_db.id


@pytest.mark.asyncio
async def test_get_parties_by_contact(party_service: PartyService, party_in_db: Party):
    # Test contact one
    parties = await party_service.get_parties_by_contact(party_in_db.contact_one.id)
    assert len(parties) == 1
    assert parties[0].id == party_in_db.id

    # Contact two is no longer stored as a student, so we cannot search by contact_two


@pytest.mark.asyncio
async def test_get_parties_by_date_range(
    party_service: PartyService, party_in_db: Party
):
    start_date = party_in_db.party_datetime - timedelta(hours=1)
    end_date = party_in_db.party_datetime + timedelta(hours=1)

    parties = await party_service.get_parties_by_date_range(start_date, end_date)
    assert len(parties) == 1
    assert parties[0].id == party_in_db.id


@pytest.mark.asyncio
async def test_get_parties_by_date_range_multiple_parties(
    party_service: PartyService, test_async_session: AsyncSession
):
    # Create account, locations and students for parties
    account1 = AccountEntity(
        id=1,
        email="john.doe@example.com",
        first_name="Test",
        last_name="User",
        pid="300000001",
        role=AccountRole.STUDENT,
    )
    account2 = AccountEntity(
        id=2,
        email="jane.smith@example.com",
        first_name="Test",
        last_name="User",
        pid="300000001",
        role=AccountRole.STUDENT,
    )
    account3 = AccountEntity(
        id=3,
        email="bob.johnson@example.com",
        first_name="Test",
        last_name="User",
        pid="300000001",
        role=AccountRole.STUDENT,
    )
    account4 = AccountEntity(
        id=4,
        email="alice.williams@example.com",
        first_name="Test",
        last_name="User",
        pid="300000001",
        role=AccountRole.STUDENT,
    )
    account5 = AccountEntity(
        id=5,
        email="charlie.brown@example.com",
        first_name="Test",
        last_name="User",
        pid="300000001",
        role=AccountRole.STUDENT,
    )
    account6 = AccountEntity(
        id=6,
        email="diana.davis@example.com",
        first_name="Test",
        last_name="User",
        pid="300000001",
        role=AccountRole.STUDENT,
    )
    address1 = LocationEntity(
        id=1,
        latitude=40.7128,
        longitude=-74.0060,
        google_place_id="test_place_1",
        formatted_address="NYC Test Address",
    )
    address2 = LocationEntity(
        id=2,
        latitude=34.0522,
        longitude=-118.2437,
        google_place_id="test_place_2",
        formatted_address="LA Test Address",
    )
    address3 = LocationEntity(
        id=3,
        latitude=41.8781,
        longitude=-87.6298,
        google_place_id="test_place_3",
        formatted_address="Chicago Test Address",
    )
    student1 = StudentEntity(
        contact_preference=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,
    )
    student2 = StudentEntity(
        contact_preference=ContactPreference.text,
        phone_number="0987654321",
        account_id=2,
    )
    student3 = StudentEntity(
        contact_preference=ContactPreference.call,
        phone_number="1111111111",
        account_id=3,
    )
    student4 = StudentEntity(
        contact_preference=ContactPreference.text,
        phone_number="2222222222",
        account_id=4,
    )
    student5 = StudentEntity(
        contact_preference=ContactPreference.call,
        phone_number="3333333333",
        account_id=5,
    )
    student6 = StudentEntity(
        contact_preference=ContactPreference.text,
        phone_number="4444444444",
        account_id=6,
    )
    test_async_session.add_all(
        [
            account1,
            account2,
            account3,
            account4,
            account5,
            account6,
            address1,
            address2,
            address3,
            student1,
            student2,
            student3,
            student4,
            student5,
            student6,
        ]
    )
    await test_async_session.commit()

    # Create parties directly in the database at different dates
    base_datetime = datetime.now() + timedelta(days=1)
    party1 = PartyEntity(
        party_datetime=base_datetime,
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    party2 = PartyEntity(
        party_datetime=base_datetime + timedelta(hours=2),
        location_id=2,
        contact_one_id=3,
        contact_two_email="test4@example.com",
        contact_two_first_name="Contact",
        contact_two_last_name="Four",
        contact_two_phone_number="4444444444",
        contact_two_contact_preference=ContactPreference.call,
    )
    party3 = PartyEntity(
        party_datetime=base_datetime + timedelta(days=5),
        location_id=3,
        contact_one_id=5,
        contact_two_email="test6@example.com",
        contact_two_first_name="Contact",
        contact_two_last_name="Six",
        contact_two_phone_number="6666666666",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add_all([party1, party2, party3])
    await test_async_session.commit()
    await test_async_session.refresh(party1)
    await test_async_session.refresh(party2)
    await test_async_session.refresh(party3)

    # Query range that includes party1 and party2 but not party3
    start_date = base_datetime - timedelta(hours=1)
    end_date = base_datetime + timedelta(hours=3)

    parties = await party_service.get_parties_by_date_range(start_date, end_date)
    assert len(parties) == 2
    party_ids = [p.id for p in parties]
    assert party1.id in party_ids
    assert party2.id in party_ids
    assert party3.id not in party_ids


@pytest.mark.asyncio
async def test_get_parties_by_date_range_no_results(
    party_service: PartyService, party_in_db: Party
):
    # Query range that doesn't include the party
    start_date = party_in_db.party_datetime + timedelta(days=1)
    end_date = party_in_db.party_datetime + timedelta(days=2)

    parties = await party_service.get_parties_by_date_range(start_date, end_date)
    assert len(parties) == 0


@pytest.mark.asyncio
async def test_get_parties_by_date_range_boundary_start(
    party_service: PartyService, party_in_db: Party
):
    # Query where party datetime equals start date (inclusive boundary)
    start_date = party_in_db.party_datetime
    end_date = party_in_db.party_datetime + timedelta(hours=1)

    parties = await party_service.get_parties_by_date_range(start_date, end_date)
    assert len(parties) == 1
    assert parties[0].id == party_in_db.id


@pytest.mark.asyncio
async def test_get_parties_by_date_range_boundary_end(
    party_service: PartyService, party_in_db: Party
):
    # Query where party datetime equals end date (inclusive boundary)
    start_date = party_in_db.party_datetime - timedelta(hours=1)
    end_date = party_in_db.party_datetime

    parties = await party_service.get_parties_by_date_range(start_date, end_date)
    assert len(parties) == 1
    assert parties[0].id == party_in_db.id


@pytest.mark.asyncio
async def test_get_parties_by_date_range_outside_before(
    party_service: PartyService, party_in_db: Party
):
    # Query range that ends just before the party datetime
    start_date = party_in_db.party_datetime - timedelta(days=2)
    end_date = party_in_db.party_datetime - timedelta(seconds=1)

    parties = await party_service.get_parties_by_date_range(start_date, end_date)
    assert len(parties) == 0


@pytest.mark.asyncio
async def test_get_parties_by_date_range_outside_after(
    party_service: PartyService, party_in_db: Party
):
    # Query range that starts just after the party datetime
    start_date = party_in_db.party_datetime + timedelta(seconds=1)
    end_date = party_in_db.party_datetime + timedelta(days=2)

    parties = await party_service.get_parties_by_date_range(start_date, end_date)
    assert len(parties) == 0


@pytest.mark.asyncio
async def test_update_party(party_service: PartyService, party_in_db: Party):
    update_data = PartyData(
        party_datetime=party_in_db.party_datetime + timedelta(hours=2),
        location_id=party_in_db.location.id,
        contact_one_id=party_in_db.contact_one.id,
        contact_two=party_in_db.contact_two,
    )

    updated = await party_service.update_party(party_in_db.id, update_data)
    assert party_in_db.id == updated.id
    assert updated.party_datetime == update_data.party_datetime


@pytest.mark.asyncio
async def test_update_party_not_found(
    party_service: PartyService, sample_party_data: PartyData
):
    with pytest.raises(PartyNotFoundException):
        await party_service.update_party(999, sample_party_data)


@pytest.mark.asyncio
async def test_update_party_invalid_location(
    party_service: PartyService, party_in_db: Party
):
    invalid_update = PartyData(
        party_datetime=party_in_db.party_datetime,
        location_id=999,  # Non-existent location
        contact_one_id=party_in_db.contact_one.id,
        contact_two=party_in_db.contact_two,
    )
    with pytest.raises(LocationNotFoundException):
        await party_service.update_party(party_in_db.id, invalid_update)


@pytest.mark.asyncio
async def test_update_party_invalid_contact_one(
    party_service: PartyService, party_in_db: Party
):
    invalid_update = PartyData(
        party_datetime=party_in_db.party_datetime,
        location_id=party_in_db.location.id,
        contact_one_id=999,  # Non-existent student
        contact_two=party_in_db.contact_two,
    )
    with pytest.raises(StudentNotFoundException):
        await party_service.update_party(party_in_db.id, invalid_update)


# Test removed: contact_two is no longer validated as a student
# Contact two is stored as contact information, not as a foreign key to students


@pytest.mark.asyncio
async def test_delete_party(party_service: PartyService, party_in_db: Party):
    deleted = await party_service.delete_party(party_in_db.id)
    assert deleted.id == party_in_db.id
    assert deleted.party_datetime == party_in_db.party_datetime

    with pytest.raises(PartyNotFoundException):
        await party_service.get_party_by_id(party_in_db.id)


@pytest.mark.asyncio
async def test_delete_party_not_found(party_service: PartyService):
    with pytest.raises(PartyNotFoundException):
        await party_service.delete_party(999)


@pytest.mark.asyncio
async def test_party_exists(party_service: PartyService, party_in_db: Party):
    assert await party_service.party_exists(party_in_db.id)
    assert not await party_service.party_exists(999)


@pytest.mark.asyncio
async def test_get_party_count(
    party_service: PartyService, test_async_session: AsyncSession
):
    # Create account, location and students for party
    account_one = AccountEntity(
        id=1,
        email="test@example.com",
        first_name="Test",
        last_name="User",
        pid="300000001",
        role=AccountRole.STUDENT,
    )
    account_two = AccountEntity(
        id=2,
        email="test2@example.com",
        first_name="Test",
        last_name="User",
        pid="300000001",
        role=AccountRole.STUDENT,
    )
    address = LocationEntity(
        id=1,
        latitude=40.7128,
        longitude=-74.0060,
        google_place_id="test_place_1",
        formatted_address="NYC Test Address",
    )
    student1 = StudentEntity(
        contact_preference=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,
    )
    student2 = StudentEntity(
        contact_preference=ContactPreference.text,
        phone_number="0987654321",
        account_id=2,
    )
    test_async_session.add_all([account_one, account_two, address, student1, student2])
    await test_async_session.commit()

    initial_count = await party_service.get_party_count()

    party = PartyEntity(
        party_datetime=datetime.now() + timedelta(days=1),
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(party)
    await test_async_session.commit()

    new_count = await party_service.get_party_count()
    assert new_count == initial_count + 1


@pytest.mark.asyncio
async def test_get_parties_by_student_and_date(
    party_service: PartyService, party_in_db: Party
):
    parties = await party_service.get_parties_by_student_and_date(
        party_in_db.contact_one.id, party_in_db.party_datetime
    )
    assert len(parties) == 1
    assert parties[0].id == party_in_db.id

    # Contact two is no longer stored as a student, so we cannot search by contact_two

    different_date = party_in_db.party_datetime + timedelta(days=10)
    parties = await party_service.get_parties_by_student_and_date(
        party_in_db.contact_one.id, different_date
    )
    assert len(parties) == 0


@pytest.mark.asyncio
async def test_get_parties_by_radius(
    party_service: PartyService,
    parties_with_radius_addresses: dict,
):
    search_lat = 40.7128
    search_lon = -74.0060

    parties = await party_service.get_parties_by_radius(search_lat, search_lon)

    assert len(parties) == 2
    party_ids = [p.id for p in parties]
    assert parties_with_radius_addresses["party1"].id in party_ids
    assert parties_with_radius_addresses["party2"].id in party_ids
    assert parties_with_radius_addresses["party3"].id not in party_ids


@pytest.mark.asyncio
async def test_get_parties_by_radius_empty_results(
    party_service: PartyService,
    test_async_session: AsyncSession,
):
    """Test that search returns empty list when no parties exist"""
    search_lat = 40.7128
    search_lon = -74.0060

    parties = await party_service.get_parties_by_radius(search_lat, search_lon)
    assert len(parties) == 0


@pytest_asyncio.fixture()
async def basic_accounts_and_students(test_async_session: AsyncSession):
    """Create basic accounts and students (2) for simpler radius tests."""
    account1 = AccountEntity(
        id=1,
        email="student1@example.com",
        first_name="Test",
        last_name="User",
        pid="300000001",
        role=AccountRole.STUDENT,
    )
    account2 = AccountEntity(
        id=2,
        email="student2@example.com",
        first_name="Test",
        last_name="User",
        pid="300000001",
        role=AccountRole.STUDENT,
    )
    test_async_session.add_all([account1, account2])
    await test_async_session.commit()

    student1 = StudentEntity(
        contact_preference=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,
    )
    student2 = StudentEntity(
        contact_preference=ContactPreference.text,
        phone_number="0987654321",
        account_id=2,
    )
    test_async_session.add_all([student1, student2])
    await test_async_session.commit()

    return {
        "account1": account1,
        "account2": account2,
        "student1": student1,
        "student2": student2,
    }


@pytest.mark.asyncio
async def test_get_parties_by_radius_time_window_outside_past(
    party_service: PartyService,
    test_async_session: AsyncSession,
    basic_accounts_and_students: dict,
):
    """Test that parties more than 6 hours in the past are excluded"""
    search_lat = 40.7128
    search_lon = -74.0060

    address1 = LocationEntity(
        id=1,
        latitude=search_lat + 0.01,
        longitude=search_lon,
        google_place_id="test_place_time_past",
        formatted_address="Test Address Time Past",
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    party1 = PartyEntity(
        party_datetime=datetime.now() - timedelta(hours=7),
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(party1)
    await test_async_session.commit()

    parties = await party_service.get_parties_by_radius(search_lat, search_lon)
    assert len(parties) == 0


@pytest.mark.asyncio
async def test_get_parties_by_radius_time_window_outside_future(
    party_service: PartyService,
    test_async_session: AsyncSession,
    basic_accounts_and_students: dict,
):
    """Test that parties more than 12 hours in the future are excluded"""
    search_lat = 40.7128
    search_lon = -74.0060

    address1 = LocationEntity(
        id=1,
        latitude=search_lat + 0.01,
        longitude=search_lon,
        google_place_id="test_place_time_future",
        formatted_address="Test Address Time Future",
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    party1 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=13),
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(party1)
    await test_async_session.commit()

    parties = await party_service.get_parties_by_radius(search_lat, search_lon)
    assert len(parties) == 0


@pytest_asyncio.fixture()
async def four_accounts_and_students(test_async_session: AsyncSession):
    """Create 4 accounts and students for boundary tests."""
    accounts = []
    students = []
    for i in range(1, 5):
        account = AccountEntity(
            id=i,
            email=f"student{i}@example.com",
            first_name="Test",
            last_name="User",
            pid="300000001",
            role=AccountRole.STUDENT,
        )
        accounts.append(account)

        student = StudentEntity(
            account_id=i,
            contact_preference=ContactPreference.call
            if i % 2 == 1
            else ContactPreference.text,
            phone_number=str(i) * 10,
        )
        students.append(student)

    test_async_session.add_all(accounts + students)
    await test_async_session.commit()

    return {"accounts": accounts, "students": students}


@pytest.mark.asyncio
async def test_get_parties_by_radius_time_window_boundaries(
    party_service: PartyService,
    test_async_session: AsyncSession,
    four_accounts_and_students: dict,
):
    """Test parties at the time window boundaries"""
    search_lat = 40.7128
    search_lon = -74.0060

    address1 = LocationEntity(
        id=1,
        latitude=search_lat + 0.002,
        longitude=search_lon,
        google_place_id="test_place_boundary_1",
        formatted_address="Test Address Boundary 1",
    )
    address2 = LocationEntity(
        id=2,
        latitude=search_lat + 0.002,
        longitude=search_lon,
        google_place_id="test_place_boundary_2",
        formatted_address="Test Address Boundary 2",
    )
    test_async_session.add_all([address1, address2])
    await test_async_session.commit()

    party1 = PartyEntity(
        party_datetime=datetime.now() - timedelta(hours=5, minutes=59),
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(party1)

    party2 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=11, minutes=59),
        location_id=2,
        contact_one_id=3,
        contact_two_email="test4@example.com",
        contact_two_first_name="Contact",
        contact_two_last_name="Four",
        contact_two_phone_number="4444444444",
        contact_two_contact_preference=ContactPreference.call,
    )
    test_async_session.add(party2)

    await test_async_session.commit()
    await test_async_session.refresh(party1)
    await test_async_session.refresh(party2)

    parties = await party_service.get_parties_by_radius(search_lat, search_lon)
    assert len(parties) == 2
    party_ids = [p.id for p in parties]
    assert party1.id in party_ids
    assert party2.id in party_ids


@pytest.mark.asyncio
async def test_get_parties_by_radius_missing_address_skipped(
    party_service: PartyService,
    test_async_session: AsyncSession,
    basic_accounts_and_students: dict,
):
    """Test that parties with missing addresses are skipped gracefully"""
    search_lat = 40.7128
    search_lon = -74.0060

    address1 = LocationEntity(
        id=1,
        latitude=search_lat + 0.002,
        longitude=search_lon,
        google_place_id="test_place_missing",
        formatted_address="Test Address Missing",
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    party1 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=2),
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(party1)
    await test_async_session.commit()
    await test_async_session.refresh(party1)

    invalid_party = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=3),
        location_id=999,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(invalid_party)
    await test_async_session.commit()

    parties = await party_service.get_parties_by_radius(search_lat, search_lon)
    assert len(parties) == 1
    assert parties[0].id == party1.id


@pytest_asyncio.fixture()
async def parties_with_full_relationships(
    test_async_session: AsyncSession,
):
    """Create parties with full relationships (location, contacts with accounts) for CSV export tests."""
    # Create location
    location = LocationEntity(
        id=1,
        latitude=40.7128,
        longitude=-74.0060,
        google_place_id="test_place_id_csv",
        formatted_address="123 Test St, Test City, TC 12345",
    )
    test_async_session.add(location)

    # Create accounts
    account_one = AccountEntity(
        id=1,
        pid="730123456",
        email="contact1@example.com",
        first_name="John",
        last_name="Doe",
        role=AccountRole.STUDENT,
    )
    test_async_session.add_all([account_one])

    # Create students
    student_one = StudentEntity(
        contact_preference=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,
    )
    test_async_session.add(student_one)
    await test_async_session.commit()

    # Create parties
    party1 = PartyEntity(
        party_datetime=datetime(2024, 6, 15, 20, 30, 0),
        location_id=1,
        contact_one_id=1,
        contact_two_email="contact2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    party2 = PartyEntity(
        party_datetime=datetime(2024, 7, 20, 18, 0, 0),
        location_id=1,
        contact_one_id=1,
        contact_two_email="contact2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add_all([party1, party2])
    await test_async_session.commit()
    await test_async_session.refresh(party1)
    await test_async_session.refresh(party2)

    return [party1.to_model(), party2.to_model()]


@pytest.mark.asyncio
async def test_export_parties_to_csv_empty_list(party_service: PartyService):
    """Test that empty list returns CSV with headers only."""
    csv_content = await party_service.export_parties_to_csv([])

    reader = csv.reader(csv_content.splitlines())
    rows = list(reader)

    assert len(rows) == 1  # Only header row
    assert rows[0] == [
        "Fully formatted address",
        "Date of Party",
        "Time of Party",
        "Contact One Full Name",
        "Contact One Email",
        "Contact One Phone Number",
        "Contact One Contact Preference",
        "Contact Two Full Name",
        "Contact Two Email",
        "Contact Two Phone Number",
        "Contact Two Contact Preference",
    ]


@pytest.mark.asyncio
async def test_export_parties_to_csv_single_party(
    party_service: PartyService,
    parties_with_full_relationships: list[Party],
):
    """Test single party with all relationships populated."""
    csv_content = await party_service.export_parties_to_csv(
        [parties_with_full_relationships[0]]
    )

    reader = csv.reader(csv_content.splitlines())
    rows = list(reader)

    assert len(rows) == 2  # Header + 1 data row
    assert len(rows[0]) == 11  # 11 columns
    assert len(rows[1]) == 11  # 11 columns

    # Verify header
    assert rows[0][0] == "Fully formatted address"

    # Verify data row
    data_row = rows[1]
    assert data_row[0] == "123 Test St, Test City, TC 12345"  # Address
    assert data_row[1] == "2024-06-15"  # Date
    assert data_row[2] == "20:30:00"  # Time
    assert data_row[3] == "John Doe"  # Contact One Full Name
    assert data_row[4] == "contact1@example.com"  # Contact One Email
    assert data_row[5] == "1234567890"  # Contact One Phone
    assert data_row[6] == "call"  # Contact One Preference
    assert data_row[7] == "Jane Smith"  # Contact Two Full Name
    assert data_row[8] == "contact2@example.com"  # Contact Two Email
    assert data_row[9] == "0987654321"  # Contact Two Phone
    assert data_row[10] == "text"  # Contact Two Preference


@pytest.mark.asyncio
async def test_export_parties_to_csv_multiple_parties(
    party_service: PartyService,
    parties_with_full_relationships: list[Party],
):
    """Test multiple parties in correct order."""
    csv_content = await party_service.export_parties_to_csv(
        parties_with_full_relationships
    )

    reader = csv.reader(csv_content.splitlines())
    rows = list(reader)

    assert len(rows) == 3  # Header + 2 data rows
    assert rows[1][1] == "2024-06-15"  # First party date
    assert rows[2][1] == "2024-07-20"  # Second party date


@pytest.mark.asyncio
async def test_export_parties_to_csv_csv_format_validation(
    party_service: PartyService,
    parties_with_full_relationships: list[Party],
):
    """Verify CSV structure (headers, row count, column count)."""
    csv_content = await party_service.export_parties_to_csv(
        parties_with_full_relationships
    )

    reader = csv.reader(csv_content.splitlines())
    rows = list(reader)

    # Verify header row exists
    assert len(rows) > 0
    assert len(rows[0]) == 11  # 11 columns

    # Verify all data rows have 11 columns
    for row in rows[1:]:
        assert len(row) == 11

    # Verify header content
    expected_headers = [
        "Fully formatted address",
        "Date of Party",
        "Time of Party",
        "Contact One Full Name",
        "Contact One Email",
        "Contact One Phone Number",
        "Contact One Contact Preference",
        "Contact Two Full Name",
        "Contact Two Email",
        "Contact Two Phone Number",
        "Contact Two Contact Preference",
    ]
    assert rows[0] == expected_headers


@pytest.mark.asyncio
async def test_export_parties_to_csv_date_time_formatting(
    party_service: PartyService,
    parties_with_full_relationships: list[Party],
):
    """Verify date/time are formatted correctly (YYYY-MM-DD, HH:MM:SS)."""
    csv_content = await party_service.export_parties_to_csv(
        [parties_with_full_relationships[0]]
    )

    reader = csv.reader(csv_content.splitlines())
    rows = list(reader)

    data_row = rows[1]
    # Verify date format YYYY-MM-DD
    assert data_row[1] == "2024-06-15"
    assert len(data_row[1]) == 10
    assert data_row[1].count("-") == 2

    # Verify time format HH:MM:SS
    assert data_row[2] == "20:30:00"
    assert len(data_row[2]) == 8
    assert data_row[2].count(":") == 2


@pytest.mark.asyncio
async def test_export_parties_to_csv_contact_preference_values(
    party_service: PartyService,
    parties_with_full_relationships: list[Party],
):
    """Verify contact preference enum values are exported."""
    csv_content = await party_service.export_parties_to_csv(
        parties_with_full_relationships
    )

    reader = csv.reader(csv_content.splitlines())
    rows = list(reader)

    # First party: contact_one=call, contact_two=text
    assert rows[1][6] == "call"
    assert rows[1][10] == "text"

    # Verify values are enum string values, not enum objects
    assert isinstance(rows[1][6], str)
    assert isinstance(rows[1][10], str)


@pytest.mark.asyncio
async def test_export_parties_to_csv_special_characters(
    party_service: PartyService,
    test_async_session: AsyncSession,
):
    """Test CSV escaping with special characters in names/addresses."""
    location = LocationEntity(
        id=1,
        latitude=40.7128,
        longitude=-74.0060,
        google_place_id="test_place_id",
        formatted_address='123 "Test" St, Test, City',
    )
    test_async_session.add(location)

    account_one = AccountEntity(
        id=1,
        pid="730123456",
        first_name="John, Jr.",
        last_name="O'Brien",
        email="contact1@example.com",
        role=AccountRole.STUDENT,
    )

    test_async_session.add(account_one)

    student_one = StudentEntity(
        contact_preference=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,
    )

    test_async_session.add(student_one)
    await test_async_session.commit()

    party = PartyEntity(
        party_datetime=datetime(2024, 6, 15, 20, 30, 0),
        location_id=1,
        contact_one_id=1,
        contact_two_email="contact2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(party)
    await test_async_session.commit()
    await test_async_session.refresh(party)

    csv_content = await party_service.export_parties_to_csv(
        [await party.load_model(test_async_session)]
    )

    reader = csv.reader(csv_content.splitlines())
    rows = list(reader)

    # CSV reader should handle special characters correctly
    assert len(rows) == 2
    # Verify special characters are preserved (CSV module handles escaping)
    assert "O'Brien" in rows[1][3] or '"O\'Brien"' in rows[1][3]
    assert "Test" in rows[1][0]  # Address with quotes


@pytest.mark.asyncio
async def test_export_parties_to_csv_full_name_concatenation(
    party_service: PartyService,
    parties_with_full_relationships: list[Party],
):
    """Verify first_name + last_name formatting."""
    csv_content = await party_service.export_parties_to_csv(
        [parties_with_full_relationships[0]]
    )

    reader = csv.reader(csv_content.splitlines())
    rows = list(reader)

    # Verify full name concatenation
    assert rows[1][3] == "John Doe"  # Contact One: "John" + " " + "Doe"
    assert rows[1][7] == "Jane Smith"  # Contact Two: "Jane" + " " + "Smith"


@pytest.mark.asyncio
async def test_export_parties_to_csv_all_columns_populated(
    party_service: PartyService,
    parties_with_full_relationships: list[Party],
):
    """Verify all 11 columns have correct data."""
    csv_content = await party_service.export_parties_to_csv(
        [parties_with_full_relationships[0]]
    )

    reader = csv.reader(csv_content.splitlines())
    rows = list(reader)

    data_row = rows[1]
    # Verify all columns are populated (not empty strings for valid data)
    assert data_row[0] != ""  # Address
    assert data_row[1] != ""  # Date
    assert data_row[2] != ""  # Time
    assert data_row[3] != ""  # Contact One Full Name
    assert data_row[4] != ""  # Contact One Email
    assert data_row[5] != ""  # Contact One Phone
    assert data_row[6] != ""  # Contact One Preference
    assert data_row[7] != ""  # Contact Two Full Name
    assert data_row[8] != ""  # Contact Two Email
    assert data_row[9] != ""  # Contact Two Phone
    assert data_row[10] != ""  # Contact Two Preference


@pytest.mark.asyncio
async def test_get_parties_by_radius_and_date_range_basic(
    party_service: PartyService,
    test_async_session: AsyncSession,
    four_accounts_and_students: dict,
):
    """Test that parties within both radius and date range are returned"""
    search_lat = 40.7128
    search_lon = -74.0060

    # Address 1: within radius (~0.14 miles)
    address1 = LocationEntity(
        id=1,
        latitude=search_lat + 0.002,
        longitude=search_lon,
        google_place_id="test_place_basic_1",
        formatted_address="Test Address Basic 1",
    )
    # Address 2: within radius (~0.21 miles)
    address2 = LocationEntity(
        id=2,
        latitude=search_lat + 0.003,
        longitude=search_lon,
        google_place_id="test_place_basic_2",
        formatted_address="Test Address Basic 2",
    )
    # Address 3: outside radius (~0.28 miles)
    address3 = LocationEntity(
        id=3,
        latitude=search_lat + 0.004,
        longitude=search_lon,
        google_place_id="test_place_basic_3",
        formatted_address="Test Address Basic 3",
    )
    test_async_session.add_all([address1, address2, address3])
    await test_async_session.commit()

    base_time = datetime.now() + timedelta(hours=2)

    party1 = PartyEntity(
        party_datetime=base_time,
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    party2 = PartyEntity(
        party_datetime=base_time + timedelta(hours=2),
        location_id=2,
        contact_one_id=2,
        contact_two_email="test3@example.com",
        contact_two_first_name="John",
        contact_two_last_name="Doe",
        contact_two_phone_number="1111111111",
        contact_two_contact_preference=ContactPreference.call,
    )
    party3 = PartyEntity(
        party_datetime=base_time + timedelta(hours=1),
        location_id=3,
        contact_one_id=3,
        contact_two_email="test4@example.com",
        contact_two_first_name="Alice",
        contact_two_last_name="Brown",
        contact_two_phone_number="2222222222",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add_all([party1, party2, party3])
    await test_async_session.commit()

    # Create date range that includes all parties
    start_date = base_time - timedelta(hours=1)
    end_date = base_time + timedelta(hours=4)

    parties = await party_service.get_parties_by_radius_and_date_range(
        search_lat, search_lon, start_date, end_date
    )

    assert len(parties) == 2
    party_ids = [p.id for p in parties]
    assert party1.id in party_ids
    assert party2.id in party_ids
    assert party3.id not in party_ids


@pytest.mark.asyncio
async def test_get_parties_by_radius_and_date_range_empty_results(
    party_service: PartyService,
    test_async_session: AsyncSession,
):
    """Test that empty list is returned when no parties match criteria"""
    search_lat = 40.7128
    search_lon = -74.0060

    start_date = datetime.now() + timedelta(days=1)
    end_date = datetime.now() + timedelta(days=2)

    parties = await party_service.get_parties_by_radius_and_date_range(
        search_lat, search_lon, start_date, end_date
    )
    assert len(parties) == 0


@pytest.mark.asyncio
async def test_get_parties_by_radius_and_date_range_outside_date_range_before(
    party_service: PartyService,
    test_async_session: AsyncSession,
    basic_accounts_and_students: dict,
):
    """Test that parties before start_date are excluded even if within radius"""
    search_lat = 40.7128
    search_lon = -74.0060

    address1 = LocationEntity(
        id=1,
        latitude=search_lat + 0.002,
        longitude=search_lon,
        google_place_id="test_place_date_before",
        formatted_address="Test Address Date Before",
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    # Party before the date range
    party1 = PartyEntity(
        party_datetime=datetime.now() - timedelta(hours=1),
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(party1)
    await test_async_session.commit()

    start_date = datetime.now()
    end_date = datetime.now() + timedelta(hours=5)

    parties = await party_service.get_parties_by_radius_and_date_range(
        search_lat, search_lon, start_date, end_date
    )
    assert len(parties) == 0


@pytest.mark.asyncio
async def test_get_parties_by_radius_and_date_range_outside_date_range_after(
    party_service: PartyService,
    test_async_session: AsyncSession,
    basic_accounts_and_students: dict,
):
    """Test that parties after end_date are excluded even if within radius"""
    search_lat = 40.7128
    search_lon = -74.0060

    address1 = LocationEntity(
        id=1,
        latitude=search_lat + 0.002,
        longitude=search_lon,
        google_place_id="test_place_date_after",
        formatted_address="Test Address Date After",
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    # Party after the date range
    party1 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=6),
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(party1)
    await test_async_session.commit()

    start_date = datetime.now()
    end_date = datetime.now() + timedelta(hours=5)

    parties = await party_service.get_parties_by_radius_and_date_range(
        search_lat, search_lon, start_date, end_date
    )
    assert len(parties) == 0


@pytest.mark.asyncio
async def test_get_parties_by_radius_and_date_range_boundary_start_date(
    party_service: PartyService,
    test_async_session: AsyncSession,
    basic_accounts_and_students: dict,
):
    """Test that party at start_date boundary is included (inclusive boundary)"""
    search_lat = 40.7128
    search_lon = -74.0060

    address1 = LocationEntity(
        id=1,
        latitude=search_lat + 0.002,
        longitude=search_lon,
        google_place_id="test_place_boundary_start",
        formatted_address="Test Address Boundary Start",
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    start_date = datetime.now() + timedelta(hours=2)
    party1 = PartyEntity(
        party_datetime=start_date,
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(party1)
    await test_async_session.commit()

    end_date = datetime.now() + timedelta(hours=5)

    parties = await party_service.get_parties_by_radius_and_date_range(
        search_lat, search_lon, start_date, end_date
    )
    assert len(parties) == 1
    assert parties[0].id == party1.id


@pytest.mark.asyncio
async def test_get_parties_by_radius_and_date_range_boundary_end_date(
    party_service: PartyService,
    test_async_session: AsyncSession,
    basic_accounts_and_students: dict,
):
    """Test that party at end_date boundary is included (inclusive boundary)"""
    search_lat = 40.7128
    search_lon = -74.0060

    address1 = LocationEntity(
        id=1,
        latitude=search_lat + 0.002,
        longitude=search_lon,
        google_place_id="test_place_boundary_end",
        formatted_address="Test Address Boundary End",
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    start_date = datetime.now() + timedelta(hours=1)
    end_date = datetime.now() + timedelta(hours=3)

    party1 = PartyEntity(
        party_datetime=end_date,
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(party1)
    await test_async_session.commit()

    parties = await party_service.get_parties_by_radius_and_date_range(
        search_lat, search_lon, start_date, end_date
    )
    assert len(parties) == 1
    assert parties[0].id == party1.id


@pytest.mark.asyncio
async def test_get_parties_by_radius_and_date_range_partial_overlap(
    party_service: PartyService,
    test_async_session: AsyncSession,
    basic_accounts_and_students: dict,
):
    """Test that date range partially overlapping with parties only includes those within range"""
    search_lat = 40.7128
    search_lon = -74.0060

    address1 = LocationEntity(
        id=1,
        latitude=search_lat + 0.002,
        longitude=search_lon,
        google_place_id="test_place_partial",
        formatted_address="Test Address Partial",
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    # Create parties at different times
    party1 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=1),
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    party2 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=3),
        location_id=1,
        contact_one_id=2,
        contact_two_email="test3@example.com",
        contact_two_first_name="John",
        contact_two_last_name="Doe",
        contact_two_phone_number="1111111111",
        contact_two_contact_preference=ContactPreference.call,
    )
    party3 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=5),
        location_id=1,
        contact_one_id=1,
        contact_two_email="test4@example.com",
        contact_two_first_name="Alice",
        contact_two_last_name="Brown",
        contact_two_phone_number="2222222222",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add_all([party1, party2, party3])
    await test_async_session.commit()

    # Date range that includes party1 and party2, but not party3
    start_date = datetime.now()
    end_date = datetime.now() + timedelta(hours=4)

    parties = await party_service.get_parties_by_radius_and_date_range(
        search_lat, search_lon, start_date, end_date
    )
    assert len(parties) == 2
    party_ids = [p.id for p in parties]
    assert party1.id in party_ids
    assert party2.id in party_ids
    assert party3.id not in party_ids


@pytest.mark.asyncio
async def test_get_parties_by_radius_and_date_range_outside_radius(
    party_service: PartyService,
    test_async_session: AsyncSession,
    four_accounts_and_students: dict,
):
    """Test that parties within date range but outside radius are excluded"""
    search_lat = 40.7128
    search_lon = -74.0060

    # Address 1: within radius (~0.14 miles)
    address1 = LocationEntity(
        id=1,
        latitude=search_lat + 0.002,
        longitude=search_lon,
        google_place_id="test_place_outside_radius_1",
        formatted_address="Test Address Outside Radius 1",
    )
    # Address 2: within radius (~0.21 miles)
    address2 = LocationEntity(
        id=2,
        latitude=search_lat + 0.003,
        longitude=search_lon,
        google_place_id="test_place_outside_radius_2",
        formatted_address="Test Address Outside Radius 2",
    )
    # Address 3: outside radius (~0.28 miles)
    address3 = LocationEntity(
        id=3,
        latitude=search_lat + 0.004,
        longitude=search_lon,
        google_place_id="test_place_outside_radius_3",
        formatted_address="Test Address Outside Radius 3",
    )
    test_async_session.add_all([address1, address2, address3])
    await test_async_session.commit()

    base_time = datetime.now() + timedelta(hours=2)

    party1 = PartyEntity(
        party_datetime=base_time,
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    party2 = PartyEntity(
        party_datetime=base_time + timedelta(hours=1),
        location_id=2,
        contact_one_id=2,
        contact_two_email="test3@example.com",
        contact_two_first_name="John",
        contact_two_last_name="Doe",
        contact_two_phone_number="1111111111",
        contact_two_contact_preference=ContactPreference.call,
    )
    party3 = PartyEntity(
        party_datetime=base_time + timedelta(hours=1),
        location_id=3,
        contact_one_id=3,
        contact_two_email="test4@example.com",
        contact_two_first_name="Alice",
        contact_two_last_name="Brown",
        contact_two_phone_number="2222222222",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add_all([party1, party2, party3])
    await test_async_session.commit()

    # Date range that includes all parties
    start_date = base_time - timedelta(hours=1)
    end_date = base_time + timedelta(hours=3)

    parties = await party_service.get_parties_by_radius_and_date_range(
        search_lat, search_lon, start_date, end_date
    )

    # Should only return party1 and party2 (within radius), not party3 (outside radius)
    assert len(parties) == 2
    party_ids = [p.id for p in parties]
    assert party1.id in party_ids
    assert party2.id in party_ids
    assert party3.id not in party_ids


@pytest.mark.asyncio
async def test_get_parties_by_radius_and_date_range_at_radius_boundary(
    party_service: PartyService,
    test_async_session: AsyncSession,
    basic_accounts_and_students: dict,
):
    """Test that party at or just within radius boundary is included"""
    search_lat = 40.7128
    search_lon = -74.0060

    # Create address very close to the radius boundary (within 0.25 miles)
    # 0.25 miles ≈ 0.0036 degrees latitude
    address1 = LocationEntity(
        id=1,
        latitude=search_lat + 0.003,  # ~0.21 miles, well within 0.25 miles
        longitude=search_lon,
        google_place_id="test_place_radius_boundary",
        formatted_address="Test Address Radius Boundary",
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    party1 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=2),
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(party1)
    await test_async_session.commit()

    start_date = datetime.now()
    end_date = datetime.now() + timedelta(hours=5)

    parties = await party_service.get_parties_by_radius_and_date_range(
        search_lat, search_lon, start_date, end_date
    )
    assert len(parties) == 1
    assert parties[0].id == party1.id


@pytest.mark.asyncio
async def test_get_parties_by_radius_and_date_range_combined_filtering(
    party_service: PartyService,
    test_async_session: AsyncSession,
    four_accounts_and_students: dict,
):
    """Test multiple parties with various combinations of radius and date range filtering"""
    search_lat = 40.7128
    search_lon = -74.0060

    # Address within radius
    address1 = LocationEntity(
        id=1,
        latitude=search_lat + 0.002,  # ~0.14 miles, within radius
        longitude=search_lon,
        google_place_id="test_place_combined_1",
        formatted_address="Test Address Combined 1",
    )
    # Address outside radius
    address2 = LocationEntity(
        id=2,
        latitude=search_lat + 0.004,  # ~0.28 miles, outside radius
        longitude=search_lon,
        google_place_id="test_place_combined_2",
        formatted_address="Test Address Combined 2",
    )
    test_async_session.add_all([address1, address2])
    await test_async_session.commit()

    base_time = datetime.now()

    # Party 1: Within both radius AND date range (should be included)
    party1 = PartyEntity(
        party_datetime=base_time + timedelta(hours=2),
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )

    # Party 2: Within radius but outside date range (should be excluded)
    party2 = PartyEntity(
        party_datetime=base_time + timedelta(hours=6),
        location_id=1,
        contact_one_id=2,
        contact_two_email="test3@example.com",
        contact_two_first_name="John",
        contact_two_last_name="Doe",
        contact_two_phone_number="1111111111",
        contact_two_contact_preference=ContactPreference.call,
    )

    # Party 3: Within date range but outside radius (should be excluded)
    party3 = PartyEntity(
        party_datetime=base_time + timedelta(hours=2),
        location_id=2,
        contact_one_id=3,
        contact_two_email="test4@example.com",
        contact_two_first_name="Alice",
        contact_two_last_name="Brown",
        contact_two_phone_number="2222222222",
        contact_two_contact_preference=ContactPreference.text,
    )

    # Party 4: Outside both radius AND date range (should be excluded)
    party4 = PartyEntity(
        party_datetime=base_time + timedelta(hours=6),
        location_id=2,
        contact_one_id=4,
        contact_two_email="test5@example.com",
        contact_two_first_name="Bob",
        contact_two_last_name="White",
        contact_two_phone_number="3333333333",
        contact_two_contact_preference=ContactPreference.call,
    )

    test_async_session.add_all([party1, party2, party3, party4])
    await test_async_session.commit()

    start_date = base_time + timedelta(hours=1)
    end_date = base_time + timedelta(hours=4)

    parties = await party_service.get_parties_by_radius_and_date_range(
        search_lat, search_lon, start_date, end_date
    )

    # Only party1 should be included
    assert len(parties) == 1
    assert parties[0].id == party1.id


@pytest.mark.asyncio
async def test_get_parties_by_radius_and_date_range_missing_location_skipped(
    party_service: PartyService,
    test_async_session: AsyncSession,
    basic_accounts_and_students: dict,
):
    """Test that parties with missing/null location relationship are skipped gracefully"""
    search_lat = 40.7128
    search_lon = -74.0060

    address1 = LocationEntity(
        id=1,
        latitude=search_lat + 0.002,
        longitude=search_lon,
        google_place_id="test_place_missing_location",
        formatted_address="Test Address Missing Location",
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    party1 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=2),
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(party1)
    await test_async_session.commit()
    await test_async_session.refresh(party1)

    # Create party with invalid location_id (bypassing service validation)
    invalid_party = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=3),
        location_id=999,  # Invalid location_id
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(invalid_party)
    await test_async_session.commit()

    start_date = datetime.now()
    end_date = datetime.now() + timedelta(hours=5)

    parties = await party_service.get_parties_by_radius_and_date_range(
        search_lat, search_lon, start_date, end_date
    )
    # Only party1 should be returned, invalid_party should be skipped
    assert len(parties) == 1
    assert parties[0].id == party1.id


@pytest.mark.asyncio
async def test_get_parties_by_radius_and_date_range_single_day_range(
    party_service: PartyService,
    test_async_session: AsyncSession,
    basic_accounts_and_students: dict,
):
    """Test date range of a single day (start_date == end_date)"""
    search_lat = 40.7128
    search_lon = -74.0060

    address1 = LocationEntity(
        id=1,
        latitude=search_lat + 0.002,
        longitude=search_lon,
        google_place_id="test_place_single_day",
        formatted_address="Test Address Single Day",
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    target_date = datetime.now() + timedelta(days=1)
    target_date = target_date.replace(hour=12, minute=0, second=0, microsecond=0)

    party1 = PartyEntity(
        party_datetime=target_date,
        location_id=1,
        contact_one_id=1,
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
    )
    test_async_session.add(party1)
    await test_async_session.commit()

    # Single day range (start and end are the same)
    start_date = target_date
    end_date = target_date

    parties = await party_service.get_parties_by_radius_and_date_range(
        search_lat, search_lon, start_date, end_date
    )
    assert len(parties) == 1
    assert parties[0].id == party1.id
