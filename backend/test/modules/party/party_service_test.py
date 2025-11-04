from datetime import datetime, timedelta

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.address.address_entity import AddressEntity
from src.modules.party.party_entity import PartyEntity
from src.modules.party.party_model import Party, PartyData
from src.modules.party.party_service import (
    AddressNotFoundException,
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
    # Create address
    address = AddressEntity(id=1, latitude=40.7128, longitude=-74.0060)
    test_async_session.add(address)

    # Create accounts
    account_one = AccountEntity(
        id=1,
        email="test_one@example.com",
        hashed_password="$2b$12$test_hashed_password_one",
        role=AccountRole.STUDENT,
    )
    account_two = AccountEntity(
        id=2,
        email="test_two@example.com",
        hashed_password="$2b$12$test_hashed_password_two",
        role=AccountRole.STUDENT,
    )
    test_async_session.add_all([account_one, account_two])

    # Create students
    student_one = StudentEntity(
        account_id=1,
        first_name="John",
        last_name="Doe",
        call_or_text_pref=ContactPreference.call,
        phone_number="1234567890",
    )
    student_two = StudentEntity(
        account_id=2,
        first_name="Jane",
        last_name="Smith",
        call_or_text_pref=ContactPreference.text,
        phone_number="0987654321",
    )
    test_async_session.add_all([student_one, student_two])
    await test_async_session.commit()

    return PartyData(
        party_datetime=datetime.now() + timedelta(days=1),
        address_id=1,
        contact_one_id=1,
        contact_two_id=2,
    )


@pytest_asyncio.fixture()
async def party_in_db(
    test_async_session: AsyncSession, sample_party_data: PartyData
) -> Party:
    """Create a party directly in the database, bypassing the service layer."""
    from src.modules.party.party_entity import PartyEntity

    party_entity = PartyEntity(
        party_datetime=sample_party_data.party_datetime,
        address_id=sample_party_data.address_id,
        contact_one_id=sample_party_data.contact_one_id,
        contact_two_id=sample_party_data.contact_two_id,
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
    from src.modules.party.party_entity import PartyEntity

    parties = []

    for days_offset in [1, 2, 5]:
        party_entity = PartyEntity(
            party_datetime=datetime.now() + timedelta(days=days_offset),
            address_id=sample_party_data.address_id,
            contact_one_id=sample_party_data.contact_one_id,
            contact_two_id=sample_party_data.contact_two_id,
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
            hashed_password="...",
            role=AccountRole.STUDENT,
        )
        accounts.append(account)

        student = StudentEntity(
            account_id=i,
            first_name=["John", "Jane", "Bob", "Alice", "Charlie", "Diana"][i - 1],
            last_name=["Doe", "Smith", "Johnson", "Williams", "Brown", "Davis"][i - 1],
            call_or_text_pref=ContactPreference.call
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
    address1 = AddressEntity(
        id=1,
        latitude=search_lat + 0.0217,
        longitude=search_lon,
    )
    test_async_session.add(address1)

    party1 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=2),
        address_id=1,
        contact_one_id=1,
        contact_two_id=2,
    )
    test_async_session.add(party1)

    # Address 2: ~4 km away (within radius)
    address2 = AddressEntity(
        id=2,
        latitude=search_lat - 0.0362,
        longitude=search_lon,
    )
    test_async_session.add(address2)

    party2 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=4),
        address_id=2,
        contact_one_id=3,
        contact_two_id=4,
    )
    test_async_session.add(party2)

    # Address 3: ~6.4 km away (outside radius)
    address3 = AddressEntity(
        id=3,
        latitude=search_lat + 0.0580,
        longitude=search_lon,
    )
    test_async_session.add(address3)

    party3 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=6),
        address_id=3,
        contact_one_id=5,
        contact_two_id=6,
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
    assert party.address_id == sample_party_data.address_id
    assert party.contact_one_id == sample_party_data.contact_one_id
    assert party.contact_two_id == sample_party_data.contact_two_id


@pytest.mark.asyncio
async def test_create_party_invalid_address(
    party_service: PartyService, sample_party_data: PartyData
) -> None:
    invalid_data = PartyData(
        party_datetime=sample_party_data.party_datetime,
        address_id=999,  # Non-existent address
        contact_one_id=sample_party_data.contact_one_id,
        contact_two_id=sample_party_data.contact_two_id,
    )
    with pytest.raises(AddressNotFoundException):
        await party_service.create_party(invalid_data)


@pytest.mark.asyncio
async def test_create_party_invalid_contact_one(
    party_service: PartyService, sample_party_data: PartyData
) -> None:
    invalid_data = PartyData(
        party_datetime=sample_party_data.party_datetime,
        address_id=sample_party_data.address_id,
        contact_one_id=999,  # Non-existent student
        contact_two_id=sample_party_data.contact_two_id,
    )
    with pytest.raises(StudentNotFoundException):
        await party_service.create_party(invalid_data)


@pytest.mark.asyncio
async def test_create_party_invalid_contact_two(
    party_service: PartyService, sample_party_data: PartyData
) -> None:
    invalid_data = PartyData(
        party_datetime=sample_party_data.party_datetime,
        address_id=sample_party_data.address_id,
        contact_one_id=sample_party_data.contact_one_id,
        contact_two_id=999,  # Non-existent student
    )
    with pytest.raises(StudentNotFoundException):
        await party_service.create_party(invalid_data)


@pytest.mark.asyncio
async def test_get_parties(
    party_service: PartyService, test_async_session: AsyncSession
):
    from src.modules.party.party_entity import PartyEntity

    # Create addresses
    address1 = AddressEntity(id=1, latitude=40.7128, longitude=-74.0060)
    address2 = AddressEntity(id=2, latitude=34.0522, longitude=-118.2437)
    test_async_session.add_all([address1, address2])

    # Create accounts and students
    accounts = []
    students = []
    for i in range(1, 5):  # Create 4 students
        account = AccountEntity(
            id=i,
            email=f"student{i}@example.com",
            hashed_password=f"$2b$12$test_hashed_password_{i}",
            role=AccountRole.STUDENT,
        )
        accounts.append(account)

        student = StudentEntity(
            account_id=i,
            first_name=f"Student{i}",
            last_name=f"Last{i}",
            call_or_text_pref=ContactPreference.call
            if i % 2 == 1
            else ContactPreference.text,
            phone_number=str(i) * 10,
        )
        students.append(student)

    test_async_session.add_all(accounts + students)
    await test_async_session.commit()

    # Create multiple parties directly in the database
    party1 = PartyEntity(
        party_datetime=datetime.now() + timedelta(days=1),
        address_id=1,
        contact_one_id=1,
        contact_two_id=2,
    )
    party2 = PartyEntity(
        party_datetime=datetime.now() + timedelta(days=2),
        address_id=2,
        contact_one_id=3,
        contact_two_id=4,
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
    assert party_in_db.address_id == fetched.address_id


@pytest.mark.asyncio
async def test_get_party_by_id_not_found(party_service: PartyService):
    with pytest.raises(PartyNotFoundException):
        await party_service.get_party_by_id(999)


@pytest.mark.asyncio
async def test_get_parties_by_address(party_service: PartyService, party_in_db: Party):
    parties = await party_service.get_parties_by_address(party_in_db.address_id)
    assert len(parties) == 1
    assert parties[0].id == party_in_db.id


@pytest.mark.asyncio
async def test_get_parties_by_contact(party_service: PartyService, party_in_db: Party):
    # Test contact one
    parties = await party_service.get_parties_by_contact(party_in_db.contact_one_id)
    assert len(parties) == 1
    assert parties[0].id == party_in_db.id

    # Test contact two
    parties = await party_service.get_parties_by_contact(party_in_db.contact_two_id)
    assert len(parties) == 1
    assert parties[0].id == party_in_db.id


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
    # Create addresses
    address1 = AddressEntity(id=1, latitude=40.7128, longitude=-74.0060)
    address2 = AddressEntity(id=2, latitude=34.0522, longitude=-118.2437)
    address3 = AddressEntity(id=3, latitude=41.8781, longitude=-87.6298)
    test_async_session.add_all([address1, address2, address3])

    # Create accounts and students
    accounts = []
    students = []
    for i in range(1, 7):  # Create 6 students
        account = AccountEntity(
            id=i,
            email=f"student{i}@example.com",
            hashed_password=f"$2b$12$test_hashed_password_{i}",
            role=AccountRole.STUDENT,
        )
        accounts.append(account)

        student = StudentEntity(
            account_id=i,
            first_name=f"Student{i}",
            last_name=f"Last{i}",
            call_or_text_pref=ContactPreference.call
            if i % 2 == 1
            else ContactPreference.text,
            phone_number=str(i) * 10,
        )
        students.append(student)

    test_async_session.add_all(accounts + students)
    await test_async_session.commit()

    # Create parties directly in the database at different dates
    base_datetime = datetime.now() + timedelta(days=1)
    party1 = PartyEntity(
        party_datetime=base_datetime, address_id=1, contact_one_id=1, contact_two_id=2
    )
    party2 = PartyEntity(
        party_datetime=base_datetime + timedelta(hours=2),
        address_id=2,
        contact_one_id=3,
        contact_two_id=4,
    )
    party3 = PartyEntity(
        party_datetime=base_datetime + timedelta(days=5),
        address_id=3,
        contact_one_id=5,
        contact_two_id=6,
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
        address_id=party_in_db.address_id,
        contact_one_id=party_in_db.contact_one_id,
        contact_two_id=party_in_db.contact_two_id,
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
async def test_update_party_invalid_address(
    party_service: PartyService, party_in_db: Party
):
    invalid_update = PartyData(
        party_datetime=party_in_db.party_datetime,
        address_id=999,  # Non-existent address
        contact_one_id=party_in_db.contact_one_id,
        contact_two_id=party_in_db.contact_two_id,
    )
    with pytest.raises(AddressNotFoundException):
        await party_service.update_party(party_in_db.id, invalid_update)


@pytest.mark.asyncio
async def test_update_party_invalid_contact_one(
    party_service: PartyService, party_in_db: Party
):
    invalid_update = PartyData(
        party_datetime=party_in_db.party_datetime,
        address_id=party_in_db.address_id,
        contact_one_id=999,  # Non-existent student
        contact_two_id=party_in_db.contact_two_id,
    )
    with pytest.raises(StudentNotFoundException):
        await party_service.update_party(party_in_db.id, invalid_update)


@pytest.mark.asyncio
async def test_update_party_invalid_contact_two(
    party_service: PartyService, party_in_db: Party
):
    invalid_update = PartyData(
        party_datetime=party_in_db.party_datetime,
        address_id=party_in_db.address_id,
        contact_one_id=party_in_db.contact_one_id,
        contact_two_id=999,  # Non-existent student
    )
    with pytest.raises(StudentNotFoundException):
        await party_service.update_party(party_in_db.id, invalid_update)


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
    from src.modules.party.party_entity import PartyEntity

    address = AddressEntity(id=1, latitude=40.7128, longitude=-74.0060)
    test_async_session.add(address)

    accounts = []
    students = []
    for i in range(1, 3):
        account = AccountEntity(
            id=i,
            email=f"student{i}@example.com",
            hashed_password=f"$2b$12$test_hashed_password_{i}",
            role=AccountRole.STUDENT,
        )
        accounts.append(account)

        student = StudentEntity(
            account_id=i,
            first_name=f"Student{i}",
            last_name=f"Last{i}",
            call_or_text_pref=ContactPreference.call
            if i % 2 == 1
            else ContactPreference.text,
            phone_number=str(i) * 10,
        )
        students.append(student)

    test_async_session.add_all(accounts + students)
    await test_async_session.commit()

    initial_count = await party_service.get_party_count()

    party = PartyEntity(
        party_datetime=datetime.now() + timedelta(days=1),
        address_id=1,
        contact_one_id=1,
        contact_two_id=2,
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

    parties = await party_service.get_parties_by_student_and_date(
        party_in_db.contact_two_id, party_in_db.party_datetime
    )
    assert len(parties) == 1
    assert parties[0].id == party_in_db.id

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
        hashed_password="...",
        role=AccountRole.STUDENT,
    )
    account2 = AccountEntity(
        id=2,
        email="student2@example.com",
        hashed_password="...",
        role=AccountRole.STUDENT,
    )
    test_async_session.add_all([account1, account2])
    await test_async_session.commit()

    student1 = StudentEntity(
        first_name="John",
        last_name="Doe",
        call_or_text_pref=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,
    )
    student2 = StudentEntity(
        first_name="Jane",
        last_name="Smith",
        call_or_text_pref=ContactPreference.text,
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

    address1 = AddressEntity(
        id=1,
        latitude=search_lat + 0.01,
        longitude=search_lon,
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    party1 = PartyEntity(
        party_datetime=datetime.now() - timedelta(hours=7),
        address_id=1,
        contact_one_id=1,
        contact_two_id=2,
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

    address1 = AddressEntity(
        id=1,
        latitude=search_lat + 0.01,
        longitude=search_lon,
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    party1 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=13),
        address_id=1,
        contact_one_id=1,
        contact_two_id=2,
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
            hashed_password="...",
            role=AccountRole.STUDENT,
        )
        accounts.append(account)

        first_names = ["John", "Jane", "Bob", "Alice"]
        last_names = ["Doe", "Smith", "Johnson", "Williams"]
        student = StudentEntity(
            account_id=i,
            first_name=first_names[i - 1],
            last_name=last_names[i - 1],
            call_or_text_pref=ContactPreference.call
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

    address1 = AddressEntity(
        id=1,
        latitude=search_lat + 0.01,
        longitude=search_lon,
    )
    address2 = AddressEntity(
        id=2,
        latitude=search_lat + 0.01,
        longitude=search_lon,
    )
    test_async_session.add_all([address1, address2])
    await test_async_session.commit()

    party1 = PartyEntity(
        party_datetime=datetime.now() - timedelta(hours=5, minutes=59),
        address_id=1,
        contact_one_id=1,
        contact_two_id=2,
    )
    test_async_session.add(party1)

    party2 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=11, minutes=59),
        address_id=2,
        contact_one_id=3,
        contact_two_id=4,
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

    address1 = AddressEntity(
        id=1,
        latitude=search_lat + 0.01,
        longitude=search_lon,
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    party1 = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=2),
        address_id=1,
        contact_one_id=1,
        contact_two_id=2,
    )
    test_async_session.add(party1)
    await test_async_session.commit()
    await test_async_session.refresh(party1)

    invalid_party = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=3),
        address_id=999,
        contact_one_id=1,
        contact_two_id=2,
    )
    test_async_session.add(invalid_party)
    await test_async_session.commit()

    parties = await party_service.get_parties_by_radius(search_lat, search_lon)
    assert len(parties) == 1
    assert parties[0].id == party1.id
