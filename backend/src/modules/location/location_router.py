from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Response, status
from src.core.authentication import (
    authenticate_by_role,
)
from src.core.exceptions import error_response
from src.core.utils.query_utils import (
    PAGINATED_QUERY_RESPONSES,
    ListQueryParams,
    get_paginated_openapi_params,
    parse_export_list_query_params,
    parse_list_query_params,
)
from src.modules.location.location_base_model import AddressData, LocationData
from src.modules.location.location_model import (
    AutocompleteInput,
    AutocompleteResult,
    LocationCreate,
    LocationDto,
    PaginatedLocationResponse,
)
from src.modules.location.location_service import LocationService

location_router = APIRouter(prefix="/api/locations", tags=["locations"])
_OPENAPI_PARAMS = get_paginated_openapi_params(LocationService.QUERY_FIELDS)

# Shared OpenAPI error responses for routes that resolve or mutate a location via
# Google Maps — the same set of location-layer exceptions can surface from all of them.
_LOCATION_WRITE_RESPONSES: dict[int | str, dict[str, Any]] = {
    400: error_response("The provided place ID has an invalid format"),
    404: error_response("Place ID not found in Google Maps"),
    409: error_response(
        "A location with the same Google place ID already exists (rare race condition)"
    ),
    500: error_response("Google Maps API request failed while resolving the location"),
}


@location_router.post(
    "/autocomplete",
    response_model=list[AutocompleteResult],
    status_code=status.HTTP_200_OK,
    summary="Autocomplete an address",
    responses={
        500: error_response("Google Maps API request failed"),
    },
)
async def autocomplete_address(
    input_data: AutocompleteInput,
    location_service: LocationService = Depends(),
    _=Depends(authenticate_by_role("officer", "police_admin", "student", "admin", "staff")),
) -> list[AutocompleteResult]:
    """Return dwelling-level address suggestions for a partial address string.

    Suggestions are restricted to the Chapel Hill, NC area (10 km radius with
    ``strict_bounds``). Bare street predictions (no street number) are filtered
    out because they cannot be used as party registration addresses.
    """
    return await location_service.autocomplete_address(input_data.address)


@location_router.get(
    "/place-details/{place_id}",
    response_model=AddressData,
    status_code=status.HTTP_200_OK,
    summary="Get address details for a Google Maps place ID",
    responses={
        400: error_response("The provided place ID has an invalid format"),
        404: error_response("Place not found in Google Maps for the given place ID"),
        500: error_response("Google Maps API request failed"),
    },
)
async def get_place_details(
    place_id: str,
    location_service: LocationService = Depends(),
    _=Depends(authenticate_by_role("officer", "police_admin", "student", "admin", "staff")),
) -> AddressData:
    """Return address components and coordinates for a Google Maps place ID.

    Used by the frontend after the user selects an autocomplete suggestion to
    preview the resolved address before submitting a registration form.
    """
    return await location_service.get_place_details(place_id)


@location_router.get(
    "",
    response_model=PaginatedLocationResponse,
    summary="List locations (paginated)",
    openapi_extra=_OPENAPI_PARAMS,
    responses=PAGINATED_QUERY_RESPONSES,
)
async def get_locations(
    params: ListQueryParams = parse_list_query_params(),
    location_service: LocationService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin", "police_admin")),
) -> PaginatedLocationResponse:
    """List locations with pagination, sorting, and filtering.

    Supports all sortable/filterable fields defined on `LocationService.QUERY_FIELDS`,
    including derived incident counts per severity.
    """
    return await location_service.get_locations_paginated(params)


@location_router.get(
    "/csv",
    summary="Export locations as an Excel file",
    openapi_extra=_OPENAPI_PARAMS,
    responses=PAGINATED_QUERY_RESPONSES,
)
async def get_locations_csv(
    params: ListQueryParams = parse_export_list_query_params(),
    location_service: LocationService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin")),
) -> Response:
    """Export locations as an Excel file.

    Supports the same filter/sort query params as ``GET /api/locations``. Returns
    a ``.xlsx`` attachment with columns: Address, and per-severity incident counts
    (Remote Warning, In-Person Warning, Citation).
    """
    locations_response = await location_service.get_locations_paginated(params)
    excel_content = location_service.export_locations_to_excel(locations_response)
    filename = f"locations_{datetime.now(ZoneInfo('America/New_York')).strftime('%Y_%m_%d')}.xlsx"
    return Response(
        content=excel_content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@location_router.get(
    "/{location_id}",
    response_model=LocationDto,
    summary="Get a location by ID",
    responses={
        404: error_response("Location with the given ID was not found"),
    },
)
async def get_location(
    location_id: int,
    location_service: LocationService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin")),
) -> LocationDto:
    """Get a single location by database ID, including all associated incidents."""
    return await location_service.get_location_by_id(location_id)


@location_router.post(
    "",
    status_code=201,
    response_model=LocationDto,
    summary="Create a location",
    responses=_LOCATION_WRITE_RESPONSES,
)
async def create_location(
    data: LocationCreate,
    location_service: LocationService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> LocationDto:
    """Create a new location from a Google Maps place ID (admin only).

    The place ID is resolved via Google Maps to populate all address fields and
    coordinates. An optional ``hold_expiration`` bars the location from hosting
    parties until the given time.
    """
    address_data = await location_service.get_place_details(data.google_place_id)
    return await location_service.create_location(
        LocationData.from_address(
            address_data,
            hold_expiration=data.hold_expiration,
        )
    )


@location_router.put(
    "/{location_id}",
    response_model=LocationDto,
    summary="Update a location",
    responses={
        **_LOCATION_WRITE_RESPONSES,
        404: error_response("Location not found, or place ID not found in Google Maps"),
    },
)
async def update_location(
    location_id: int,
    data: LocationCreate,
    location_service: LocationService = Depends(),
    _=Depends(authenticate_by_role("admin")),
) -> LocationDto:
    """Update a location's place ID and/or hold expiration (admin only).

    If ``google_place_id`` has changed, the new place is resolved via Google Maps
    and all address fields are refreshed. If the place ID is unchanged, only the
    ``hold_expiration`` is updated without a Maps API call.
    """
    location = await location_service.get_location_by_id(location_id)

    # If place_id changed, fetch new address data; otherwise use existing location
    if location.google_place_id != data.google_place_id:
        address_data = await location_service.get_place_details(data.google_place_id)
        location_data = LocationData.from_address(
            address_data,
            hold_expiration=data.hold_expiration,
        )
    else:
        location_data = LocationData(
            **location.model_dump(exclude={"hold_expiration", "id", "incidents"}),
            hold_expiration=data.hold_expiration,
        )

    return await location_service.update_location(location_id, location_data)
