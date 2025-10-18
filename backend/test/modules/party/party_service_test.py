import pytest
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from src.modules.party.party_model import PartyData
from src.modules.party.party_service import (
    PartyConflictException,
    PartyNotFoundException,
    PartyService,
)


@pytest.fixture()
def party_service(test_async_session: AsyncSession) -> PartyService:
    return PartyService(session=test_async_session)


@pytest.fixture()
def sample_party_data() -> PartyData:
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
async def test_get_parties(party_service: PartyService, sample_party_data: PartyData):
    # Create multiple parties
    party1 = await party_service.create_party(sample_party_data)
    
    party_data_2 = PartyData(
        party_datetime=datetime.now() + timedelta(days=2),
        address_id=2,
        contact_one_id=3,
        contact_two_id=4
    )
    party2 = await party_service.create_party(party_data_2)
    
    parties = await party_service.get_parties()
    assert len(parties) >= 2
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
    assert len(parties) >= 1
    assert any(p.id == party.id for p in parties)


@pytest.mark.asyncio
async def test_get_parties_by_contact(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)
    
    # Test contact one
    parties = await party_service.get_parties_by_contact(sample_party_data.contact_one_id)
    assert len(parties) >= 1
    assert any(p.id == party.id for p in parties)
    
    # Test contact two
    parties = await party_service.get_parties_by_contact(sample_party_data.contact_two_id)
    assert len(parties) >= 1
    assert any(p.id == party.id for p in parties)


@pytest.mark.asyncio
async def test_get_parties_by_date_range(party_service: PartyService, sample_party_data: PartyData):
    party = await party_service.create_party(sample_party_data)
    
    start_date = sample_party_data.party_datetime - timedelta(hours=1)
    end_date = sample_party_data.party_datetime + timedelta(hours=1)
    
    parties = await party_service.get_parties_by_date_range(start_date, end_date)
    assert len(parties) >= 1
    assert any(p.id == party.id for p in parties)


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
    assert await party_service.party_exists(party.id) == True
    assert await party_service.party_exists(999) == False


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
    assert len(parties) >= 1
    assert any(p.id == party.id for p in parties)
    
    # Test with contact two
    parties = await party_service.get_parties_by_student_and_date(
        sample_party_data.contact_two_id, 
        sample_party_data.party_datetime
    )
    assert len(parties) >= 1
    assert any(p.id == party.id for p in parties)
    
    # Test with different date (should return empty)
    different_date = sample_party_data.party_datetime + timedelta(days=10)
    parties = await party_service.get_parties_by_student_and_date(
        sample_party_data.contact_one_id, 
        different_date
    )
    assert not any(p.id == party.id for p in parties)