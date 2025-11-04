from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.authentication import authenticate_user  # correct name based on your file
from src.core.database import get_session
from src.modules.location.location_service import LocationService

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.get("/", dependencies=[Depends(authenticate_user)])
async def get_locations(session: AsyncSession = Depends(get_session)):
    """Return all locations."""
    service = LocationService(session)
    return await service.get_all_locations()


@router.get("/{location_id}", dependencies=[Depends(authenticate_user)])
async def get_location_by_id(
    location_id: int, session: AsyncSession = Depends(get_session)
):
    """Return a location by its ID."""
    service = LocationService(session)
    location = await service.get_location_by_id(location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.post("/", dependencies=[Depends(authenticate_user)])
async def create_location(place_id: str, session: AsyncSession = Depends(get_session)):
    """Create a new location."""
    service = LocationService(session)
    return await service.create_location(place_id)


@router.put("/{location_id}", dependencies=[Depends(authenticate_user)])
async def update_location(
    location_id: int, place_id: str, session: AsyncSession = Depends(get_session)
):
    """Update a location."""
    service = LocationService(session)
    return await service.update_location(location_id, place_id)


@router.delete("/{location_id}", dependencies=[Depends(authenticate_user)])
async def delete_location(
    location_id: int, session: AsyncSession = Depends(get_session)
):
    """Delete a location."""
    service = LocationService(session)
    return await service.delete_location(location_id)
