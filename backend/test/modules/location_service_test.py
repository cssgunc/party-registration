# pyright: reportGeneralTypeIssues=false, reportMissingParameterType=false

import pytest
from src.modules.location.location_model import LocationCreate, LocationUpdate
from src.modules.location.location_service import LocationService


@pytest.mark.asyncio
async def test_create_location(test_async_session):
    """Test creating a new location"""
    service = LocationService(test_async_session)
    data = LocationCreate(name="Campus Library", city="Chapel Hill")
    location = await service.create_location(data)

    assert location.id is not None
    assert location.name == "Campus Library"
    assert location.city == "Chapel Hill"


@pytest.mark.asyncio
async def test_get_location_by_id(test_async_session):
    """Test retrieving a location by ID"""
    service = LocationService(test_async_session)
    data = LocationCreate(name="Student Union", city="Durham")
    created = await service.create_location(data)

    fetched = await service.get_location_by_id(created.id)
    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.name == "Student Union"


@pytest.mark.asyncio
async def test_update_location(test_async_session):
    """Test updating an existing location"""
    service = LocationService(test_async_session)
    data = LocationCreate(name="Old Well", city="Chapel Hill")
    created = await service.create_location(data)

    updated_data = LocationUpdate(city="Carrboro")
    updated = await service.update_location(created.id, updated_data)

    assert updated.id == created.id
    assert updated.city == "Carrboro"


@pytest.mark.asyncio
async def test_delete_location(test_async_session):
    """Test deleting a location"""
    service = LocationService(test_async_session)
    data = LocationCreate(name="Memorial Hall", city="Chapel Hill")
    created = await service.create_location(data)

    await service.delete_location(created.id)
    result = await service.get_location_by_id(created.id)

    assert result is None
