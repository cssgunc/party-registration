from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Response, status
from src.core.authentication import (
    authenticate_by_role,
)
from src.core.utils.query_utils import (
    ListQueryParams,
    get_paginated_openapi_params,
    parse_export_list_query_params,
    parse_list_query_params,
)
from src.modules.auth.auth_model import AuthPrincipal
from src.modules.location.location_base_model import AddressData, LocationData
from src.modules.location.location_model import (
    LocationCreate,
    LocationDto,
    PaginatedLocationResponse,
)
from src.modules.location.location_service import LocationService

from .location_model import AutocompleteInput, AutocompleteResult

location_router = APIRouter(prefix="/api/locations", tags=["locations"])
_OPENAPI_PARAMS = get_paginated_openapi_params(LocationService.QUERY_FIELDS)


@location_router.post(
    "/autocomplete",
    response_model=list[AutocompleteResult],
    status_code=status.HTTP_200_OK,
    summary="Autocomplete address search",
    description="Returns address suggestions based on user input using Google Maps Places API.",
    responses={
        400: {"description": "Invalid address input"},
        500: {"description": "Google Maps API request failed"},
    },
)
async def autocomplete_address(
    input_data: AutocompleteInput,
    location_service: LocationService = Depends(),
    user: AuthPrincipal = Depends(
        authenticate_by_role("officer", "police_admin", "student", "admin", "staff")
    ),
) -> list[AutocompleteResult]:
    """
    Autocomplete address search endpoint.
    """
    try:
        results = await location_service.autocomplete_address(input_data.address)
        return results
    except ValueError as e:
        # Handle validation errors from service
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as e:
        # Log error in production
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch address suggestions. Please try again later.",
        ) from e


@location_router.get(
    "/place-details/{place_id}",
    response_model=AddressData,
    status_code=status.HTTP_200_OK,
    summary="Get place details from Google Maps place ID",
    description="Returns address details including coordinates for a given place ID.",
    responses={
        400: {"description": "Invalid place ID or malformed request"},
        404: {"description": "Place not found for the given place ID"},
        500: {"description": "Google Maps API request failed"},
    },
)
async def get_place_details(
    place_id: str,
    location_service: LocationService = Depends(),
    user: AuthPrincipal = Depends(
        authenticate_by_role("officer", "police_admin", "student", "admin", "staff")
    ),
) -> AddressData:
    """
    Get place details endpoint.
    """
    try:
        address_data = await location_service.get_place_details(place_id)
        return address_data
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch place details. Please try again later.",
        ) from e


@location_router.get(
    "",
    response_model=PaginatedLocationResponse,
    openapi_extra=_OPENAPI_PARAMS,
    responses={
        400: {
            "description": "Invalid sort or filter parameter: unknown field or unsupported operator"
        },
    },
)
async def get_locations(
    params: ListQueryParams = parse_list_query_params(),
    location_service: LocationService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin", "police_admin")),
) -> PaginatedLocationResponse:
    """
    Returns all locations with pagination, sorting, and filtering.
    """
    return await location_service.get_locations_paginated(params)


@location_router.get(
    "/csv",
    openapi_extra=_OPENAPI_PARAMS,
    responses={
        400: {
            "description": "Invalid sort or filter parameter: unknown field or unsupported operator"
        },
    },
)
async def get_locations_csv(
    params: ListQueryParams = parse_export_list_query_params(),
    location_service: LocationService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin")),
) -> Response:
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
    responses={
        404: {"description": "Location not found"},
    },
)
async def get_location(
    location_id: int,
    location_service: LocationService = Depends(),
    _=Depends(authenticate_by_role("staff", "admin")),
):
    return await location_service.get_location_by_id(location_id)


@location_router.post(
    "",
    status_code=201,
    response_model=LocationDto,
    responses={
        400: {"description": "Invalid Google place ID"},
        404: {"description": "Place not found for the given place ID"},
        409: {"description": "Location with this Google place ID already exists"},
        500: {"description": "Google Maps API request failed"},
    },
)
async def create_location(
    data: LocationCreate,
    location_service: LocationService = Depends(),
    _=Depends(authenticate_by_role("admin")),
):
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
    responses={
        400: {"description": "Invalid Google place ID"},
        404: {"description": "Location not found, or place not found for the given place ID"},
        409: {"description": "Location with this Google place ID already exists"},
        500: {"description": "Google Maps API request failed"},
    },
)
async def update_location(
    location_id: int,
    data: LocationCreate,
    location_service: LocationService = Depends(),
    _=Depends(authenticate_by_role("admin")),
):
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
