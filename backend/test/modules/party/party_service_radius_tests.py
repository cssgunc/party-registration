from datetime import datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.account.account_entity import AccountEntity, AccountRole
from src.modules.address.address_entity import AddressEntity
from src.modules.party.party_entity import PartyEntity
from src.modules.party.party_model import PartyData
from src.modules.party.party_service import PartyService
from src.modules.student.student_entity import StudentEntity
from src.modules.student.student_model import ContactPreference


@pytest.fixture()
def party_service(test_async_session: AsyncSession) -> PartyService:
    return PartyService(session=test_async_session)


@pytest.mark.asyncio
async def test_get_parties_by_radius(
    party_service: PartyService,
    test_async_session: AsyncSession,
):
    search_lat = 40.7128
    search_lon = -74.0060

    # --- FIX: Create accounts for students ---
    accounts = []
    for i in range(1, 7):
        accounts.append(
            AccountEntity(
                id=i,
                email=f"student{i}@example.com",
                hashed_password="...",
                role=AccountRole.STUDENT,
            )
        )
    test_async_session.add_all(accounts)
    await test_async_session.commit()
    # ----------------------------------------

    student1 = StudentEntity(
        id=1,
        first_name="John",
        last_name="Doe",
        call_or_text_pref=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,  # --- FIX ---
    )
    student2 = StudentEntity(
        id=2,
        first_name="Jane",
        last_name="Smith",
        call_or_text_pref=ContactPreference.text,
        phone_number="0987654321",
        account_id=2,  # --- FIX ---
    )
    student3 = StudentEntity(
        id=3,
        first_name="Bob",
        last_name="Johnson",
        call_or_text_pref=ContactPreference.call,
        phone_number="1111111111",
        account_id=3,  # --- FIX ---
    )
    student4 = StudentEntity(
        id=4,
        first_name="Alice",
        last_name="Williams",
        call_or_text_pref=ContactPreference.text,
        phone_number="2222222222",
        account_id=4,  # --- FIX ---
    )
    student5 = StudentEntity(
        id=5,
        first_name="Charlie",
        last_name="Brown",
        call_or_text_pref=ContactPreference.call,
        phone_number="3333333333",
        account_id=5,  # --- FIX ---
    )
    student6 = StudentEntity(
        id=6,
        first_name="Diana",
        last_name="Davis",
        call_or_text_pref=ContactPreference.text,
        phone_number="4444444444",
        account_id=6,  # --- FIX ---
    )
    test_async_session.add_all(
        [student1, student2, student3, student4, student5, student6]
    )
    await test_async_session.commit()

    # Party 1: Approximately 1.5 miles away (within radius)
    address1 = AddressEntity(
        id=1,
        latitude=search_lat + 0.0217,  # ~1.5 miles north
        longitude=search_lon,
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    party_data_1 = PartyData(
        party_datetime=datetime.now() + timedelta(hours=2),
        address_id=1,
        contact_one_id=1,
        contact_two_id=2,
    )
    party1 = await party_service.create_party(party_data_1)

    # Party 2: Approximately 2.5 miles away (within radius)
    address2 = AddressEntity(
        id=2,
        latitude=search_lat - 0.0362,  # ~2.5 miles south
        longitude=search_lon,
    )
    test_async_session.add(address2)
    await test_async_session.commit()

    party_data_2 = PartyData(
        party_datetime=datetime.now() + timedelta(hours=4),
        address_id=2,
        contact_one_id=3,
        contact_two_id=4,
    )
    party2 = await party_service.create_party(party_data_2)

    # Party 3: Approximately 4.0 miles away (outside radius)
    address3 = AddressEntity(
        id=3,
        latitude=search_lat + 0.0580,  # ~4 miles north
        longitude=search_lon,
    )
    test_async_session.add(address3)
    await test_async_session.commit()

    party_data_3 = PartyData(
        party_datetime=datetime.now() + timedelta(hours=6),
        address_id=3,
        contact_one_id=5,
        contact_two_id=6,
    )
    party3 = await party_service.create_party(party_data_3)

    parties = await party_service.get_parties_by_radius(search_lat, search_lon)

    assert len(parties) == 2
    party_ids = [p.id for p in parties]
    assert party1.id in party_ids
    assert party2.id in party_ids
    assert party3.id not in party_ids


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


@pytest.mark.asyncio
async def test_get_parties_by_radius_time_window_outside_past(
    party_service: PartyService,
    test_async_session: AsyncSession,
):
    """Test that parties more than 6 hours in the past are excluded"""
    search_lat = 40.7128
    search_lon = -74.0060

    # --- FIX: Create accounts for students ---
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
    # ----------------------------------------

    student1 = StudentEntity(
        id=1,
        first_name="John",
        last_name="Doe",
        call_or_text_pref=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,  # --- FIX ---
    )
    student2 = StudentEntity(
        id=2,
        first_name="Jane",
        last_name="Smith",
        call_or_text_pref=ContactPreference.text,
        phone_number="0987654321",
        account_id=2,  # --- FIX ---
    )
    test_async_session.add_all([student1, student2])
    await test_async_session.commit()

    # Create address close to search point (within radius)
    address1 = AddressEntity(
        id=1,
        latitude=search_lat + 0.01,  # Very close
        longitude=search_lon,
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    # Create party 7 hours in the past (outside time window)
    party_data_1 = PartyData(
        party_datetime=datetime.now() - timedelta(hours=7),
        address_id=1,
        contact_one_id=1,
        contact_two_id=2,
    )
    await party_service.create_party(party_data_1)

    parties = await party_service.get_parties_by_radius(search_lat, search_lon)
    assert len(parties) == 0


@pytest.mark.asyncio
async def test_get_parties_by_radius_time_window_outside_future(
    party_service: PartyService,
    test_async_session: AsyncSession,
):
    """Test that parties more than 12 hours in the future are excluded"""
    search_lat = 40.7128
    search_lon = -74.0060

    # --- FIX: Create accounts for students ---
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
    # ----------------------------------------

    student1 = StudentEntity(
        id=1,
        first_name="John",
        last_name="Doe",
        call_or_text_pref=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,  # --- FIX ---
    )
    student2 = StudentEntity(
        id=2,
        first_name="Jane",
        last_name="Smith",
        call_or_text_pref=ContactPreference.text,
        phone_number="0987654321",
        account_id=2,  # --- FIX ---
    )
    test_async_session.add_all([student1, student2])
    await test_async_session.commit()

    # Create address close to search point (within radius)
    address1 = AddressEntity(
        id=1,
        latitude=search_lat + 0.01,  # Very close
        longitude=search_lon,
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    # Create party 13 hours in the future (outside time window)
    party_data_1 = PartyData(
        party_datetime=datetime.now() + timedelta(hours=13),
        address_id=1,
        contact_one_id=1,
        contact_two_id=2,
    )
    await party_service.create_party(party_data_1)

    parties = await party_service.get_parties_by_radius(search_lat, search_lon)
    assert len(parties) == 0


@pytest.mark.asyncio
async def test_get_parties_by_radius_time_window_boundaries(
    party_service: PartyService,
    test_async_session: AsyncSession,
):
    """Test parties at the time window boundaries"""
    search_lat = 40.7128
    search_lon = -74.0060

    # --- FIX: Create accounts for students ---
    accounts = []
    for i in range(1, 5):
        accounts.append(
            AccountEntity(
                id=i,
                email=f"student{i}@example.com",
                hashed_password="...",
                role=AccountRole.STUDENT,
            )
        )
    test_async_session.add_all(accounts)
    await test_async_session.commit()
    # ----------------------------------------

    student1 = StudentEntity(
        id=1,
        first_name="John",
        last_name="Doe",
        call_or_text_pref=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,  # --- FIX ---
    )
    student2 = StudentEntity(
        id=2,
        first_name="Jane",
        last_name="Smith",
        call_or_text_pref=ContactPreference.text,
        phone_number="0987654321",
        account_id=2,  # --- FIX ---
    )
    student3 = StudentEntity(
        id=3,
        first_name="Bob",
        last_name="Johnson",
        call_or_text_pref=ContactPreference.call,
        phone_number="1111111111",
        account_id=3,  # --- FIX ---
    )
    student4 = StudentEntity(
        id=4,
        first_name="Alice",
        last_name="Williams",
        call_or_text_pref=ContactPreference.text,
        phone_number="2222222222",
        account_id=4,  # --- FIX ---
    )
    test_async_session.add_all([student1, student2, student3, student4])
    await test_async_session.commit()

    # Create addresses close to search point
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

    # Party just inside the time window (5 hours and 59 minutes in the past)
    party_data_1 = PartyData(
        party_datetime=datetime.now() - timedelta(hours=5, minutes=59),
        address_id=1,
        contact_one_id=1,
        contact_two_id=2,
    )
    party1 = await party_service.create_party(party_data_1)

    # Party just inside the time window (11 hours and 59 minutes in the future)
    party_data_2 = PartyData(
        party_datetime=datetime.now() + timedelta(hours=11, minutes=59),
        address_id=2,
        contact_one_id=3,
        contact_two_id=4,
    )
    party2 = await party_service.create_party(party_data_2)

    parties = await party_service.get_parties_by_radius(search_lat, search_lon)
    assert len(parties) == 2
    party_ids = [p.id for p in parties]
    assert party1.id in party_ids
    assert party2.id in party_ids


@pytest.mark.asyncio
async def test_get_parties_by_radius_missing_address_skipped(
    party_service: PartyService,
    test_async_session: AsyncSession,
):
    """Test that parties with missing addresses are skipped gracefully"""
    search_lat = 40.7128
    search_lon = -74.0060

    # --- FIX: Create accounts for students ---
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
    # ----------------------------------------

    student1 = StudentEntity(
        id=1,
        first_name="John",
        last_name="Doe",
        call_or_text_pref=ContactPreference.call,
        phone_number="1234567890",
        account_id=1,  # --- FIX ---
    )
    student2 = StudentEntity(
        id=2,
        first_name="Jane",
        last_name="Smith",
        call_or_text_pref=ContactPreference.text,
        phone_number="0987654321",
        account_id=2,  # --- FIX ---
    )
    test_async_session.add_all([student1, student2])
    await test_async_session.commit()

    # Create address close to search point
    address1 = AddressEntity(
        id=1,
        latitude=search_lat + 0.01,
        longitude=search_lon,
    )
    test_async_session.add(address1)
    await test_async_session.commit()

    # Create party with valid address
    party_data_1 = PartyData(
        party_datetime=datetime.now() + timedelta(hours=2),
        address_id=1,
        contact_one_id=1,
        contact_two_id=2,
    )
    party1 = await party_service.create_party(party_data_1)

    # Create party with non-existent address (directly insert to bypass validation)

    invalid_party = PartyEntity(
        party_datetime=datetime.now() + timedelta(hours=3),
        address_id=999,  # Non-existent address
        contact_one_id=1,
        contact_two_id=2,
    )
    test_async_session.add(invalid_party)
    await test_async_session.commit()

    parties = await party_service.get_parties_by_radius(search_lat, search_lon)
    # Should only return the party with valid address
    assert len(parties) == 1
    assert parties[0].id == party1.id
