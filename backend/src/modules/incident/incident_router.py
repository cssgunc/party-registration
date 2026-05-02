from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Response, status
from src.core.authentication import authenticate_by_role
from src.core.utils.query_utils import (
    ListQueryParams,
    get_paginated_openapi_params,
    parse_export_list_query_params,
    parse_list_query_params,
)
from src.modules.auth.auth_model import AuthPrincipal

from .incident_model import (
    IncidentCreateDto,
    IncidentDto,
    IncidentUpdateDto,
    PaginatedIncidentsResponse,
)
from .incident_service import IncidentService

incident_router = APIRouter(prefix="/api", tags=["incidents"])
_OPENAPI_PARAMS = get_paginated_openapi_params(IncidentService.QUERY_FIELDS)


@incident_router.get(
    "/incidents",
    response_model=PaginatedIncidentsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get all incidents (paginated)",
    description="Returns paginated incidents. Police, staff, or admin only.",
    openapi_extra=_OPENAPI_PARAMS,
)
async def get_incidents_paginated(
    params: ListQueryParams = parse_list_query_params(),
    incident_service: IncidentService = Depends(),
    _: AuthPrincipal = Depends(authenticate_by_role("officer", "police_admin", "staff", "admin")),
) -> PaginatedIncidentsResponse:
    return await incident_service.get_incidents_paginated(params)


@incident_router.get("/incidents/csv", openapi_extra=_OPENAPI_PARAMS)
async def get_incidents_csv(
    params: ListQueryParams = parse_export_list_query_params(),
    incident_service: IncidentService = Depends(),
    _: AuthPrincipal = Depends(authenticate_by_role("officer", "police_admin", "staff", "admin")),
) -> Response:
    incident_data = await incident_service.get_incidents_with_addresses(params)
    excel_content = incident_service.export_incidents_to_excel(incident_data)
    filename = f"incidents_{datetime.now(ZoneInfo('America/New_York')).strftime('%Y_%m_%d')}.xlsx"
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@incident_router.get(
    "/locations/{location_id}/incidents",
    response_model=list[IncidentDto],
    status_code=status.HTTP_200_OK,
    summary="Get all incidents for a location",
    description="Returns all incidents for a location. Police, staff, or admin only.",
)
async def get_incidents_by_location(
    location_id: int,
    incident_service: IncidentService = Depends(),
    _: AuthPrincipal = Depends(authenticate_by_role("officer", "police_admin", "staff", "admin")),
) -> list[IncidentDto]:
    """Get all incidents for a location."""
    return await incident_service.get_incidents_by_location(location_id)


@incident_router.post(
    "/incidents",
    response_model=IncidentDto,
    status_code=status.HTTP_201_CREATED,
    summary="Create an incident",
    description="Creates a new incident, auto-creating the location if needed. Police or admin.",
)
async def create_incident(
    incident_data: IncidentCreateDto,
    incident_service: IncidentService = Depends(),
    _: AuthPrincipal = Depends(authenticate_by_role("officer", "police_admin", "admin")),
) -> IncidentDto:
    """Create an incident."""
    return await incident_service.create_incident(incident_data)


@incident_router.put(
    "/incidents/{incident_id}",
    response_model=IncidentDto,
    status_code=status.HTTP_200_OK,
    summary="Update an incident",
    description="Updates an existing incident. Police or admin only.",
)
async def update_incident(
    incident_id: int,
    incident_data: IncidentUpdateDto,
    incident_service: IncidentService = Depends(),
    _: AuthPrincipal = Depends(authenticate_by_role("officer", "police_admin", "admin")),
) -> IncidentDto:
    """Update an incident."""
    return await incident_service.update_incident(incident_id, incident_data)


@incident_router.delete(
    "/incidents/{incident_id}",
    response_model=IncidentDto,
    status_code=status.HTTP_200_OK,
    summary="Delete an incident",
    description="Deletes an incident. Police or admin only.",
)
async def delete_incident(
    incident_id: int,
    incident_service: IncidentService = Depends(),
    _: AuthPrincipal = Depends(authenticate_by_role("officer", "police_admin", "admin")),
) -> IncidentDto:
    """Delete an incident."""
    return await incident_service.delete_incident(incident_id)
