from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.authentication import authenticate_user
from src.core.database import get_session
from src.modules.location.location_model import (
    LocationCreate,
    LocationOut,
    LocationUpdate,
)
from src.modules.location.location_service import LocationService

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.get("/", response_model=List[LocationOut])
async def get_locations(
    session: AsyncSession = Depends(get_session), user=Depends(authenticate_user)
):
    service = LocationService(session)
    return await service.get_all_locations()


@router.get("/{location_id}", response_model=LocationOut)
async def get_location_by_id(
    location_id: int,
    session: AsyncSession = Depends(get_session),
    user=Depends(authenticate_user),
):
    service = LocationService(session)
    location = await service.get_location_by_id(location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location


@router.post("/", response_model=LocationOut, status_code=status.HTTP_201_CREATED)
async def create_location(
    data: LocationCreate,
    session: AsyncSession = Depends(get_session),
    user=Depends(authenticate_user),
):
    service = LocationService(session)
    # Uniqueness validation for Google Maps place_id
    existing = await service.get_location_by_place_id(data.place_id)
    if existing:
        raise HTTPException(
            status_code=400, detail="Location already exists for this place_id"
        )
    return await service.create_location(data)


@router.put("/{location_id}", response_model=LocationOut)
async def update_location(
    location_id: int,
    data: LocationUpdate,
    session: AsyncSession = Depends(get_session),
    user=Depends(authenticate_user),
):
    service = LocationService(session)
    updated = await service.update_location(location_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Location not found")
    return updated


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: int,
    session: AsyncSession = Depends(get_session),
    user=Depends(authenticate_user),
):
    service = LocationService(session)
    deleted = await service.delete_location(location_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Location not found")
    return
