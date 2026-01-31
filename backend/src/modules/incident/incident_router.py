from fastapi import APIRouter, Depends, status
from src.core.authentication import authenticate_police_or_admin, authenticate_police_staff_or_admin
from src.modules.account.account_model import AccountDto
from src.modules.police.police_model import PoliceAccountDto

from .incident_model import IncidentCreateDto, IncidentDto
from .incident_service import IncidentService

incident_router = APIRouter(prefix="/api/locations", tags=["incidents"])


@incident_router.get(
    "/{location_id}/incidents",
    response_model=list[IncidentDto],
    status_code=status.HTTP_200_OK,
    summary="Get all incidents for a location",
    description="Returns all incidents for a location. Police, staff, or admin only.",
)
async def get_incidents_by_location(
    location_id: int,
    incident_service: IncidentService = Depends(),
    _: AccountDto | PoliceAccountDto = Depends(authenticate_police_staff_or_admin),
) -> list[IncidentDto]:
    """Get all incidents for a location."""
    return await incident_service.get_incidents_by_location(location_id)


@incident_router.post(
    "/{location_id}/incidents",
    response_model=IncidentDto,
    status_code=status.HTTP_201_CREATED,
    summary="Create an incident for a location",
    description="Creates a new incident associated with a location. Police or admin only.",
)
async def create_incident(
    location_id: int,
    incident_data: IncidentCreateDto,
    incident_service: IncidentService = Depends(),
    _: AccountDto | PoliceAccountDto = Depends(authenticate_police_or_admin),
) -> IncidentDto:
    """Create an incident for a location."""
    return await incident_service.create_incident(location_id, incident_data)


@incident_router.put(
    "/{location_id}/incidents/{incident_id}",
    response_model=IncidentDto,
    status_code=status.HTTP_200_OK,
    summary="Update an incident",
    description="Updates an existing incident. Police or admin only.",
)
async def update_incident(
    location_id: int,
    incident_id: int,
    incident_data: IncidentCreateDto,
    incident_service: IncidentService = Depends(),
    _: AccountDto | PoliceAccountDto = Depends(authenticate_police_or_admin),
) -> IncidentDto:
    """Update an incident."""
    return await incident_service.update_incident(incident_id, location_id, incident_data)


@incident_router.delete(
    "/{location_id}/incidents/{incident_id}",
    response_model=IncidentDto,
    status_code=status.HTTP_200_OK,
    summary="Delete an incident",
    description="Deletes an incident. Police or admin only.",
)
async def delete_incident(
    location_id: int,
    incident_id: int,
    incident_service: IncidentService = Depends(),
    _: AccountDto | PoliceAccountDto = Depends(authenticate_police_or_admin),
) -> IncidentDto:
    """Delete an incident."""
    return await incident_service.delete_incident(incident_id)
