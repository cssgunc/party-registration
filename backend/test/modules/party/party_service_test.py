import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.party.party_model import PartyData
from src.modules.party.party_service import (
    AddressNotFoundException,
    PartyNotFoundException,
    PartyService,
    StudentNotFoundException,
)
from src.modules.address.address_entity import AddressEntity
from src.modules.student.student_entity import StudentEntity, CallOrTextPref


@pytest.fixture()
def party_service(test_async_session: AsyncSession) -> PartyService:
    return PartyService(session=test_async_session)


@pytest_asyncio.fixture()
async def sample_party_data(test_async_session: AsyncSession) -> PartyData:
    # Create address
    address = AddressEntity(id=1)
    test_async_session.add(address)

    # Create students
    student_one = StudentEntity(
        id=1,
        first_name="John",
        last_name="Doe",
        call_or_text_pref=CallOrTextPref.call,
        phone_number="1234567890"
    )
    student_two = StudentEntity(
        id=2,
        first_name="Jane",
        last_name="Smith",
        call_or_text_pref=CallOrTextPref.text,
        phone_number="0987654321"
    )
    test_async_session.add_all([student_one, student_two])
    await test_async_session.commit()

    return PartyData(
        party_datetime=datetime.now() + timedelta(days=1),
        address_id=1,
        contact_one_id=1,
        contact_two_id=2
    )


@pytest.mark.asyncio
async def test_create_party(party_service: PartyService, sample_party_data: PartyData) -> None:
    party = await party_service.create_party(sample_party_data)
    assert party is not None
    assert party.id is not None
    assert party.party_datetime == sample_party_data.party_datetime
    assert party.address_id == sample_party_data.address_id
    assert party.contact_one_id == sample_party_data.contact_one_id
    assert party.contact_two_id == sample_party_data.contact_two_id


@pytest.mark.asyncio
async def test_create_party_invalid_address(party_service: PartyService, sample_party_data: PartyData) -> None:
    invalid_data = PartyData(
        party_datetime=sample_party_data.party_datetime,
        address_id=999,  # Non-existent address
        contact_one_id=sample_party_data.contact_one_id,
        contact_two_id=sample_party_data.contact_two_id
    )
    with pytest.raises(AddressNotFoundException):
        await party_service.create_party(invalid_data)


@pytest.mark.asyncio
async def test_create_party_invalid_contact_one(party_service: PartyService, sample_party_data: PartyData) -> None:
    invalid_data = PartyData(
        party_datetime=sample_party_data.party_datetime,
        address_id=sample_party_data.address_id,
        contact_one_id=999,  # Non-existent student
        contact_two_id=sample_party_data.contact_two_id
    )
    with pytest.raises(StudentNotFoundException):
        await party_service.create_party(invalid_data)


@pytest.mark.asyncio
async def test_create_party_invalid_contact_two(party_service: PartyService, sample_party_data: PartyData) -> None:
    invalid_data = PartyData(
        party_datetime=sample_party_data.party_datetime,
        address_id=sample_party_data.address_id,
        contact_one_id=sample_party_data.contact_one_id,
        contact_two_id=999  # Non-existent student
    )
    with pytest.raises(StudentNotFoundException):
        await party_service.create_party(invalid_data)


@pytest.mark.asyncio
async def test_get_parties(party_service: PartyService, sample_party_data: PartyData, test_async_session: AsyncSession):
    # Create multiple parties
    party1 = await party_service.create_party(sample_party_data)

    # Create additional entities for second party
    address2 = AddressEntity(id=2)
    student3 = StudentEntity(id=3, first_name="Bob", last_name="Johnson", call_or_text_pref=CallOrTextPref.call, phone_number="1111111111")
    student4 = StudentEntity(id=4, first_name="Alice", last_name="Williams", call_or_text_pref=CallOrTextPref.text, phone_number="2222222222")
    test_async_session.add_all([address2, student3, student4])
    await test_async_session.commit()

    party_data_2 = PartyData(
        party_datetime=datetime.now() + timedelta(days=2),
        address_id=2,
        contact_one_id=3,
        contact_two_id=4
    )
    party2 = await party_service.create_party(party_data_2)

    parties = await party_service.get_parties()
    assert len(parties) == 2
    party_ids = [p.id for p in parties]
    assert party1.id in party_ids
    assert party2.id in party_ids


@pytest.mark.asyncio
async def test_get_party_by_id(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)
    fetched = await party_service.get_party_by_id(party.id)
    assert party.id == fetched.id
    assert party.party_datetime == fetched.party_datetime
    assert party.address_id == fetched.address_id


@pytest.mark.asyncio
async def test_get_party_by_id_not_found(party_service: PartyService):
    with pytest.raises(PartyNotFoundException):
        await party_service.get_party_by_id(999)


@pytest.mark.asyncio
async def test_get_parties_by_address(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)
    parties = await party_service.get_parties_by_address(sample_party_data.address_id)
    assert len(parties) == 1
    assert parties[0].id == party.id


@pytest.mark.asyncio
async def test_get_parties_by_contact(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)

    # Test contact one
    parties = await party_service.get_parties_by_contact(sample_party_data.contact_one_id)
    assert len(parties) == 1
    assert parties[0].id == party.id

    # Test contact two
    parties = await party_service.get_parties_by_contact(sample_party_data.contact_two_id)
    assert len(parties) == 1
    assert parties[0].id == party.id


@pytest.mark.asyncio
async def test_get_parties_by_date_range(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)

    start_date = sample_party_data.party_datetime - timedelta(hours=1)
    end_date = sample_party_data.party_datetime + timedelta(hours=1)

    parties = await party_service.get_parties_by_date_range(start_date, end_date)
    assert len(parties) == 1
    assert parties[0].id == party.id


@pytest.mark.asyncio
async def test_get_parties_by_date_range_multiple_parties(party_service: PartyService, sample_party_data: PartyData, test_async_session: AsyncSession):
    # Create parties at different dates
    party1 = await party_service.create_party(sample_party_data)

    # Create additional entities for second party
    address2 = AddressEntity(id=2)
    student3 = StudentEntity(id=3, first_name="Bob", last_name="Johnson", call_or_text_pref=CallOrTextPref.call, phone_number="1111111111")
    student4 = StudentEntity(id=4, first_name="Alice", last_name="Williams", call_or_text_pref=CallOrTextPref.text, phone_number="2222222222")
    test_async_session.add_all([address2, student3, student4])
    await test_async_session.commit()

    party_data_2 = PartyData(
        party_datetime=sample_party_data.party_datetime + timedelta(hours=2),
        address_id=2,
        contact_one_id=3,
        contact_two_id=4
    )
    party2 = await party_service.create_party(party_data_2)

    # Create additional entities for third party
    address3 = AddressEntity(id=3)
    student5 = StudentEntity(id=5, first_name="Charlie", last_name="Brown", call_or_text_pref=CallOrTextPref.call, phone_number="3333333333")
    student6 = StudentEntity(id=6, first_name="Diana", last_name="Davis", call_or_text_pref=CallOrTextPref.text, phone_number="4444444444")
    test_async_session.add_all([address3, student5, student6])
    await test_async_session.commit()

    party_data_3 = PartyData(
        party_datetime=sample_party_data.party_datetime + timedelta(days=5),
        address_id=3,
        contact_one_id=5,
        contact_two_id=6
    )
    party3 = await party_service.create_party(party_data_3)

    # Query range that includes party1 and party2 but not party3
    start_date = sample_party_data.party_datetime - timedelta(hours=1)
    end_date = sample_party_data.party_datetime + timedelta(hours=3)

    parties = await party_service.get_parties_by_date_range(start_date, end_date)
    assert len(parties) == 2
    party_ids = [p.id for p in parties]
    assert party1.id in party_ids
    assert party2.id in party_ids
    assert party3.id not in party_ids


@pytest.mark.asyncio
async def test_get_parties_by_date_range_no_results(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)

    # Query range that doesn't include the party
    start_date = sample_party_data.party_datetime + timedelta(days=1)
    end_date = sample_party_data.party_datetime + timedelta(days=2)

    parties = await party_service.get_parties_by_date_range(start_date, end_date)
    assert len(parties) == 0


@pytest.mark.asyncio
async def test_get_parties_by_date_range_boundary_start(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)

    # Query where party datetime equals start date (inclusive boundary)
    start_date = sample_party_data.party_datetime
    end_date = sample_party_data.party_datetime + timedelta(hours=1)

    parties = await party_service.get_parties_by_date_range(start_date, end_date)
    assert len(parties) == 1
    assert parties[0].id == party.id


@pytest.mark.asyncio
async def test_get_parties_by_date_range_boundary_end(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)

    # Query where party datetime equals end date (inclusive boundary)
    start_date = sample_party_data.party_datetime - timedelta(hours=1)
    end_date = sample_party_data.party_datetime

    parties = await party_service.get_parties_by_date_range(start_date, end_date)
    assert len(parties) == 1
    assert parties[0].id == party.id


@pytest.mark.asyncio
async def test_get_parties_by_date_range_outside_before(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)

    # Query range that ends just before the party datetime
    start_date = sample_party_data.party_datetime - timedelta(days=2)
    end_date = sample_party_data.party_datetime - timedelta(seconds=1)

    parties = await party_service.get_parties_by_date_range(start_date, end_date)
    assert len(parties) == 0


@pytest.mark.asyncio
async def test_get_parties_by_date_range_outside_after(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)

    # Query range that starts just after the party datetime
    start_date = sample_party_data.party_datetime + timedelta(seconds=1)
    end_date = sample_party_data.party_datetime + timedelta(days=2)

    parties = await party_service.get_parties_by_date_range(start_date, end_date)
    assert len(parties) == 0


@pytest.mark.asyncio
async def test_update_party(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)
    
    update_data = PartyData(
        party_datetime=sample_party_data.party_datetime + timedelta(hours=2),
        address_id=sample_party_data.address_id,
        contact_one_id=sample_party_data.contact_one_id,
        contact_two_id=sample_party_data.contact_two_id
    )
    
    updated = await party_service.update_party(party.id, update_data)
    assert party.id == updated.id
    assert updated.party_datetime == update_data.party_datetime


@pytest.mark.asyncio
async def test_update_party_not_found(party_service: PartyService, sample_party_data: PartyData):
    with pytest.raises(PartyNotFoundException):
        await party_service.update_party(999, sample_party_data)


@pytest.mark.asyncio
async def test_update_party_invalid_address(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)

    invalid_update = PartyData(
        party_datetime=sample_party_data.party_datetime,
        address_id=999,  # Non-existent address
        contact_one_id=sample_party_data.contact_one_id,
        contact_two_id=sample_party_data.contact_two_id
    )
    with pytest.raises(AddressNotFoundException):
        await party_service.update_party(party.id, invalid_update)


@pytest.mark.asyncio
async def test_update_party_invalid_contact_one(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)

    invalid_update = PartyData(
        party_datetime=sample_party_data.party_datetime,
        address_id=sample_party_data.address_id,
        contact_one_id=999,  # Non-existent student
        contact_two_id=sample_party_data.contact_two_id
    )
    with pytest.raises(StudentNotFoundException):
        await party_service.update_party(party.id, invalid_update)


@pytest.mark.asyncio
async def test_update_party_invalid_contact_two(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)

    invalid_update = PartyData(
        party_datetime=sample_party_data.party_datetime,
        address_id=sample_party_data.address_id,
        contact_one_id=sample_party_data.contact_one_id,
        contact_two_id=999  # Non-existent student
    )
    with pytest.raises(StudentNotFoundException):
        await party_service.update_party(party.id, invalid_update)


@pytest.mark.asyncio
async def test_delete_party(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)
    deleted = await party_service.delete_party(party.id)
    assert deleted.id == party.id
    assert deleted.party_datetime == party.party_datetime
    
    with pytest.raises(PartyNotFoundException):
        await party_service.get_party_by_id(party.id)


@pytest.mark.asyncio
async def test_delete_party_not_found(party_service: PartyService):
    with pytest.raises(PartyNotFoundException):
        await party_service.delete_party(999)


@pytest.mark.asyncio
async def test_party_exists(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)
    assert await party_service.party_exists(party.id) 
    assert not await party_service.party_exists(999)


@pytest.mark.asyncio
async def test_get_party_count(party_service: PartyService, sample_party_data: PartyData):
    initial_count = await party_service.get_party_count()
    await party_service.create_party(sample_party_data)
    new_count = await party_service.get_party_count()
    assert new_count == initial_count + 1


@pytest.mark.asyncio
async def test_get_parties_by_student_and_date(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)

    # Test with contact one
    parties = await party_service.get_parties_by_student_and_date(
        sample_party_data.contact_one_id,
        sample_party_data.party_datetime
    )
    assert len(parties) == 1
    assert parties[0].id == party.id

    # Test with contact two
    parties = await party_service.get_parties_by_student_and_date(
        sample_party_data.contact_two_id,
        sample_party_data.party_datetime
    )
    assert len(parties) == 1
    assert parties[0].id == party.id

    # Test with different date (should return empty)
    different_date = sample_party_data.party_datetime + timedelta(days=10)
    parties = await party_service.get_parties_by_student_and_date(
        sample_party_data.contact_one_id,
        different_date
    )
    assert len(parties) == 0