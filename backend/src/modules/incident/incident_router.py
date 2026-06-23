from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Response, status
from src.core.authentication import authenticate_by_role
from src.core.exceptions import error_response
from src.core.utils.query_utils import (
    PAGINATED_QUERY_RESPONSES,
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

# Shared OpenAPI error responses for create/update endpoints that resolve a location
# via Google Maps — the same set of location-layer exceptions can surface from both.
_LOCATION_WRITE_RESPONSES: dict[int | str, dict[str, Any]] = {
    400: error_response("The provided place ID has an invalid format"),
    404: error_response("Place ID not found in Google Maps"),
    409: error_response(
        "A location with the same Google place ID already exists (rare race condition)"
    ),
    500: error_response("Google Maps API request failed while resolving the location"),
}


@incident_router.get(
    "/incidents",
    response_model=PaginatedIncidentsResponse,
    status_code=status.HTTP_200_OK,
    summary="List incidents (paginated)",
    openapi_extra=_OPENAPI_PARAMS,
    responses=PAGINATED_QUERY_RESPONSES,
)
async def get_incidents_paginated(
    params: ListQueryParams = parse_list_query_params(),
    incident_service: IncidentService = Depends(),
    _: AuthPrincipal = Depends(authenticate_by_role("officer", "police_admin", "staff", "admin")),
) -> PaginatedIncidentsResponse:
    """List incidents with pagination, sorting, and filtering.

    The response includes per-severity counts (``severity_counts``) computed
    over the same filtered result set, independent of the requested page.
    """
    return await incident_service.get_incidents_paginated(params)


@incident_router.get(
    "/incidents/csv",
    summary="Export incidents as an Excel file",
    openapi_extra=_OPENAPI_PARAMS,
    responses=PAGINATED_QUERY_RESPONSES,
)
async def get_incidents_csv(
    params: ListQueryParams = parse_export_list_query_params(),
    incident_service: IncidentService = Depends(),
    _: AuthPrincipal = Depends(authenticate_by_role("officer", "police_admin", "staff", "admin")),
) -> Response:
    """Export incidents as an Excel file.

    Supports the same filter/sort query params as ``GET /api/incidents``.
    Returns a ``.xlsx`` attachment with columns: Severity, Address, Date, Time,
    Description, and Reference ID.
    """
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
    summary="List incidents for a location",
)
async def get_incidents_by_location(
    location_id: int,
    incident_service: IncidentService = Depends(),
    _: AuthPrincipal = Depends(authenticate_by_role("officer", "police_admin", "staff", "admin")),
) -> list[IncidentDto]:
    """Get all incidents for a location, ordered by incident datetime ascending.

    Returns an empty list if no incidents exist for the given location ID.
    """
    return await incident_service.get_incidents_by_location(location_id)


@incident_router.post(
    "/incidents",
    response_model=IncidentDto,
    status_code=status.HTTP_201_CREATED,
    summary="Create an incident",
    responses=_LOCATION_WRITE_RESPONSES,
)
async def create_incident(
    incident_data: IncidentCreateDto,
    incident_service: IncidentService = Depends(),
    _: AuthPrincipal = Depends(authenticate_by_role("officer", "police_admin", "admin")),
) -> IncidentDto:
    """Create a new incident.

    The location is resolved from ``location_place_id``: if the place already
    exists in the DB it is reused; otherwise it is created via Google Maps.
    """
    return await incident_service.create_incident(incident_data)


@incident_router.put(
    "/incidents/{incident_id}",
    response_model=IncidentDto,
    status_code=status.HTTP_200_OK,
    summary="Update an incident",
    responses={
        **_LOCATION_WRITE_RESPONSES,
        404: error_response("Incident not found, or place ID not found in Google Maps"),
    },
)
async def update_incident(
    incident_id: int,
    incident_data: IncidentUpdateDto,
    incident_service: IncidentService = Depends(),
    _: AuthPrincipal = Depends(authenticate_by_role("officer", "police_admin", "admin")),
) -> IncidentDto:
    """Update an existing incident's datetime, description, severity, and location.

    The location is resolved the same way as on create: reused if it already
    exists in the DB, otherwise created via Google Maps.
    """
    return await incident_service.update_incident(incident_id, incident_data)


@incident_router.delete(
    "/incidents/{incident_id}",
    response_model=IncidentDto,
    status_code=status.HTTP_200_OK,
    summary="Delete an incident",
    responses={
        404: error_response("Incident with the given ID was not found"),
    },
)
async def delete_incident(
    incident_id: int,
    incident_service: IncidentService = Depends(),
    _: AuthPrincipal = Depends(authenticate_by_role("officer", "police_admin", "admin")),
) -> IncidentDto:
    """Delete an incident by ID and return its final state."""
    return await incident_service.delete_incident(incident_id)
