from datetime import datetime, timedelta

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.location.location_entity import LocationEntity
from src.modules.party.party_entity import PartyEntity
from src.modules.party.party_model import Party, PartyData
from src.modules.party.party_service import (
    LocationNotFoundException,
    PartyNotFoundException,
    PartyService,
    StudentNotFoundException,
)
from src.modules.student.student_entity import StudentEntity
from src.modules.student.student_model import ContactPreference


@pytest.fixture()
def party_service(test_async_session: AsyncSession) -> PartyService:
    return PartyService(session=test_async_session)


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
        first_name="John",
        last_name="Doe",
        contact_preference=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,
    )
    student_two = StudentEntity(
        first_name="Jane",
        last_name="Smith",
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
        contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text,
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
        contact_two_email=sample_party_data.contact_two_email,
        contact_two_first_name=sample_party_data.contact_two_first_name,
        contact_two_last_name=sample_party_data.contact_two_last_name,
        contact_two_phone_number=sample_party_data.contact_two_phone_number,
        contact_two_contact_preference=sample_party_data.contact_two_contact_preference,
    )
    test_async_session.add(party_entity)
    await test_async_session.commit()
    await test_async_session.refresh(party_entity)
    return party_entity.to_model()


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
            contact_two_email=sample_party_data.contact_two_email,
        contact_two_first_name=sample_party_data.contact_two_first_name,
        contact_two_last_name=sample_party_data.contact_two_last_name,
        contact_two_phone_number=sample_party_data.contact_two_phone_number,
        contact_two_contact_preference=sample_party_data.contact_two_contact_preference,
        )
        test_async_session.add(party_entity)
        parties.append(party_entity)

    await test_async_session.commit()

    for party_entity in parties:
        await test_async_session.refresh(party_entity)

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
            first_name=["John", "Jane", "Bob", "Alice", "Charlie", "Diana"][i - 1],
            last_name=["Doe", "Smith", "Johnson", "Williams", "Brown", "Davis"][i - 1],
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

    # Address 1: ~2.4 km away (within radius)
    address1 = LocationEntity(
        id=1,
        latitude=search_lat + 0.0217,
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

    # Address 2: ~4 km away (within radius)
    address2 = LocationEntity(
        id=2,
        latitude=search_lat - 0.0362,
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

    # Address 3: ~6.4 km away (outside radius)
    address3 = LocationEntity(
        id=3,
        latitude=search_lat + 0.0580,
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
    await test_async_session.refresh(party1)
    await test_async_session.refresh(party2)
    await test_async_session.refresh(party3)

    return {
        "party1": party1.to_model(),
        "party2": party2.to_model(),
        "party3": party3.to_model(),
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
    assert party.location_id == sample_party_data.location_id
    assert party.contact_one_id == sample_party_data.contact_one_id
    assert party.contact_two_email == sample_party_data.contact_two_email


@pytest.mark.asyncio
async def test_create_party_invalid_location(
    party_service: PartyService, sample_party_data: PartyData
) -> None:
    invalid_data = PartyData(
        party_datetime=sample_party_data.party_datetime,
        location_id=999,  # Non-existent location
        contact_one_id=sample_party_data.contact_one_id,
        contact_two_email=sample_party_data.contact_two_email,
        contact_two_first_name=sample_party_data.contact_two_first_name,
        contact_two_last_name=sample_party_data.contact_two_last_name,
        contact_two_phone_number=sample_party_data.contact_two_phone_number,
        contact_two_contact_preference=sample_party_data.contact_two_contact_preference,
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
        contact_two_email=sample_party_data.contact_two_email,
        contact_two_first_name=sample_party_data.contact_two_first_name,
        contact_two_last_name=sample_party_data.contact_two_last_name,
        contact_two_phone_number=sample_party_data.contact_two_phone_number,
        contact_two_contact_preference=sample_party_data.contact_two_contact_preference,
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
        first_name="John",
        last_name="Doe",
        contact_preference=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,
    )
    student2 = StudentEntity(
        first_name="Jane",
        last_name="Smith",
        contact_preference=ContactPreference.text,
        phone_number="0987654321",
        account_id=2,
    )
    student3 = StudentEntity(
        first_name="Bob",
        last_name="Johnson",
        contact_preference=ContactPreference.call,
        phone_number="1111111111",
        account_id=3,
    )
    student4 = StudentEntity(
        first_name="Alice",
        last_name="Williams",
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
    assert party_in_db.location_id == fetched.location_id


@pytest.mark.asyncio
async def test_get_party_by_id_not_found(party_service: PartyService):
    with pytest.raises(PartyNotFoundException):
        await party_service.get_party_by_id(999)


@pytest.mark.asyncio
async def test_get_parties_by_location(party_service: PartyService, party_in_db: Party):
    parties = await party_service.get_parties_by_location(party_in_db.location_id)
    assert len(parties) == 1
    assert parties[0].id == party_in_db.id


@pytest.mark.asyncio
async def test_get_parties_by_contact(party_service: PartyService, party_in_db: Party):
    # Test contact one
    parties = await party_service.get_parties_by_contact(party_in_db.contact_one_id)
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
        first_name="John",
        last_name="Doe",
        contact_preference=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,
    )
    student2 = StudentEntity(
        first_name="Jane",
        last_name="Smith",
        contact_preference=ContactPreference.text,
        phone_number="0987654321",
        account_id=2,
    )
    student3 = StudentEntity(
        first_name="Bob",
        last_name="Johnson",
        contact_preference=ContactPreference.call,
        phone_number="1111111111",
        account_id=3,
    )
    student4 = StudentEntity(
        first_name="Alice",
        last_name="Williams",
        contact_preference=ContactPreference.text,
        phone_number="2222222222",
        account_id=4,
    )
    student5 = StudentEntity(
        first_name="Charlie",
        last_name="Brown",
        contact_preference=ContactPreference.call,
        phone_number="3333333333",
        account_id=5,
    )
    student6 = StudentEntity(
        first_name="Diana",
        last_name="Davis",
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
        party_datetime=base_datetime, location_id=1, contact_one_id=1, contact_two_email="test2@example.com",
        contact_two_first_name="Jane",
        contact_two_last_name="Smith",
        contact_two_phone_number="0987654321",
        contact_two_contact_preference=ContactPreference.text
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
        location_id=party_in_db.location_id,
        contact_one_id=party_in_db.contact_one_id,
        contact_two_email=party_in_db.contact_two_email,
        contact_two_first_name=party_in_db.contact_two_first_name,
        contact_two_last_name=party_in_db.contact_two_last_name,
        contact_two_phone_number=party_in_db.contact_two_phone_number,
        contact_two_contact_preference=party_in_db.contact_two_contact_preference,
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
        contact_one_id=party_in_db.contact_one_id,
        contact_two_email=party_in_db.contact_two_email,
        contact_two_first_name=party_in_db.contact_two_first_name,
        contact_two_last_name=party_in_db.contact_two_last_name,
        contact_two_phone_number=party_in_db.contact_two_phone_number,
        contact_two_contact_preference=party_in_db.contact_two_contact_preference,
    )
    with pytest.raises(LocationNotFoundException):
        await party_service.update_party(party_in_db.id, invalid_update)


@pytest.mark.asyncio
async def test_update_party_invalid_contact_one(
    party_service: PartyService, party_in_db: Party
):
    invalid_update = PartyData(
        party_datetime=party_in_db.party_datetime,
        location_id=party_in_db.location_id,
        contact_one_id=999,  # Non-existent student
        contact_two_email=party_in_db.contact_two_email,
        contact_two_first_name=party_in_db.contact_two_first_name,
        contact_two_last_name=party_in_db.contact_two_last_name,
        contact_two_phone_number=party_in_db.contact_two_phone_number,
        contact_two_contact_preference=party_in_db.contact_two_contact_preference,
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
        first_name="John",
        last_name="Doe",
        contact_preference=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,
    )
    student2 = StudentEntity(
        first_name="Jane",
        last_name="Smith",
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
        party_in_db.contact_one_id, party_in_db.party_datetime
    )
    assert len(parties) == 1
    assert parties[0].id == party_in_db.id

    # Contact two is no longer stored as a student, so we cannot search by contact_two

    different_date = party_in_db.party_datetime + timedelta(days=10)
    parties = await party_service.get_parties_by_student_and_date(
        party_in_db.contact_one_id, different_date
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
        first_name="John",
        last_name="Doe",
        contact_preference=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,
    )
    student2 = StudentEntity(
        first_name="Jane",
        last_name="Smith",
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

        first_names = ["John", "Jane", "Bob", "Alice"]
        last_names = ["Doe", "Smith", "Johnson", "Williams"]
        student = StudentEntity(
            account_id=i,
            first_name=first_names[i - 1],
            last_name=last_names[i - 1],
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
        latitude=search_lat + 0.01,
        longitude=search_lon,
        google_place_id="test_place_boundary_1",
        formatted_address="Test Address Boundary 1",
    )
    address2 = LocationEntity(
        id=2,
        latitude=search_lat + 0.01,
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
        latitude=search_lat + 0.01,
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
