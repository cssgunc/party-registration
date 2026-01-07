from fastapi import APIRouter, Depends, status
from src.core.authentication import authenticate_police_or_admin
from src.modules.account.account_model import AccountDto
from src.modules.location.location_model import LocationDto
from src.modules.location.location_service import LocationService
from src.modules.police.police_model import PoliceAccountDto

police_router = APIRouter(prefix="/api/police", tags=["police"])


@police_router.post(
    "/locations/{location_id}/warnings",
    response_model=LocationDto,
    status_code=status.HTTP_200_OK,
    summary="Increment location warning count",
    description="Increments the warning count for a location. Requires police or admin authentication.",
)
async def increment_warnings(
    location_id: int,
    location_service: LocationService = Depends(),
    _: AccountDto | PoliceAccountDto = Depends(authenticate_police_or_admin),
) -> LocationDto:
    """
    Increment the warning count for a location by 1.
    """
    return await location_service.increment_warnings(location_id)


@police_router.post(
    "/locations/{location_id}/citations",
    response_model=LocationDto,
    status_code=status.HTTP_200_OK,
    summary="Increment location citation count",
    description="Increments the citation count for a location. Requires police or admin authentication.",
)
async def increment_citations(
    location_id: int,
    location_service: LocationService = Depends(),
    _: AccountDto | PoliceAccountDto = Depends(authenticate_police_or_admin),
) -> LocationDto:
    """
    Increment the citation count for a location by 1.
    """
    return await location_service.increment_citations(location_id)
