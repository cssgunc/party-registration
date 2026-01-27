from fastapi import APIRouter, Depends, status
from src.core.authentication import authenticate_admin, authenticate_staff_or_admin
from src.modules.account.account_model import AccountDto

from .incident_model import IncidentData, IncidentDto
from .incident_service import IncidentService

incident_router = APIRouter(prefix="/api/locations", tags=["incidents"])


@incident_router.get(
    "/{location_id}/incidents",
    response_model=list[IncidentDto],
    status_code=status.HTTP_200_OK,
    summary="Get all incidents for a location",
    description="Returns all incidents associated with a given location. Staff or admin only.",
)
async def get_incidents_by_location(
    location_id: int,
    incident_service: IncidentService = Depends(),
    _: AccountDto = Depends(authenticate_staff_or_admin),
) -> list[IncidentDto]:
    """Get all incidents for a location."""
    return await incident_service.get_incidents_by_location(location_id)


@incident_router.post(
    "/{location_id}/incidents",
    response_model=IncidentDto,
    status_code=status.HTTP_201_CREATED,
    summary="Create an incident for a location",
    description="Creates a new incident associated with a location. Admin only.",
)
async def create_incident(
    location_id: int,
    incident_data: IncidentData,
    incident_service: IncidentService = Depends(),
    _: AccountDto = Depends(authenticate_admin),
) -> IncidentDto:
    """Create an incident for a location."""
    return await incident_service.create_incident(location_id, incident_data)


@incident_router.put(
    "/{location_id}/incidents/{incident_id}",
    response_model=IncidentDto,
    status_code=status.HTTP_200_OK,
    summary="Update an incident",
    description="Updates an existing incident. Admin only.",
)
async def update_incident(
    location_id: int,
    incident_id: int,
    incident_data: IncidentData,
    incident_service: IncidentService = Depends(),
    _: AccountDto = Depends(authenticate_admin),
) -> IncidentDto:
    """Update an incident."""
    return await incident_service.update_incident(incident_id, location_id, incident_data)


@incident_router.delete(
    "/{location_id}/incidents/{incident_id}",
    response_model=IncidentDto,
    status_code=status.HTTP_200_OK,
    summary="Delete an incident",
    description="Deletes an incident. Admin only.",
)
async def delete_incident(
    location_id: int,
    incident_id: int,
    incident_service: IncidentService = Depends(),
    _: AccountDto = Depends(authenticate_admin),
) -> IncidentDto:
    """Delete an incident."""
    return await incident_service.delete_incident(incident_id)
