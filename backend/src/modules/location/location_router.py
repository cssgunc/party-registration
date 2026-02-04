from fastapi import APIRouter, Depends, HTTPException, Request, status
from src.core.authentication import (
    authenticate_admin,
    authenticate_by_role,
    authenticate_staff_or_admin,
)
from src.modules.account.account_model import AccountDto
from src.modules.location.location_model import (
    AddressData,
    LocationCreate,
    LocationData,
    LocationDto,
    PaginatedLocationResponse,
)
from src.modules.location.location_service import LocationService
from src.modules.police.police_model import PoliceAccountDto

from .location_model import AutocompleteInput, AutocompleteResult

location_router = APIRouter(prefix="/api/locations", tags=["locations"])


@location_router.post(
    "/autocomplete",
    response_model=list[AutocompleteResult],
    status_code=status.HTTP_200_OK,
    summary="Autocomplete address search",
    description="Returns address suggestions based on user input using Google Maps Places API.",
)
async def autocomplete_address(
    input_data: AutocompleteInput,
    location_service: LocationService = Depends(),
    user: AccountDto | PoliceAccountDto = Depends(
        authenticate_by_role("police", "student", "admin", "staff")
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
)
async def get_place_details(
    place_id: str,
    location_service: LocationService = Depends(),
    user: AccountDto | PoliceAccountDto = Depends(
        authenticate_by_role("police", "student", "admin", "staff")
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


@location_router.get("", response_model=PaginatedLocationResponse)
async def get_locations(
    request: Request,
    location_service: LocationService = Depends(),
    _=Depends(authenticate_staff_or_admin),
) -> PaginatedLocationResponse:
    """
    Returns all locations with pagination, sorting, and filtering.

    Query Parameters:
    - page_number: Page number (1-indexed, default: 1)
    - page_size: Items per page (default: all)
    - sort_by: Field to sort by
    - sort_order: Sort order (asc or desc, default: asc)
    """
    return await location_service.get_locations_paginated(request=request)


@location_router.get("/{location_id}", response_model=LocationDto)
async def get_location(
    location_id: int,
    location_service: LocationService = Depends(),
    _=Depends(authenticate_staff_or_admin),
):
    return await location_service.get_location_by_id(location_id)


@location_router.post("", status_code=201, response_model=LocationDto)
async def create_location(
    data: LocationCreate,
    location_service: LocationService = Depends(),
    _=Depends(authenticate_admin),
):
    address_data = await location_service.get_place_details(data.google_place_id)
    return await location_service.create_location(
        LocationData.from_address(
            address_data,
            hold_expiration=data.hold_expiration,
        )
    )


@location_router.put("/{location_id}", response_model=LocationDto)
async def update_location(
    location_id: int,
    data: LocationCreate,
    location_service: LocationService = Depends(),
    _=Depends(authenticate_admin),
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


@location_router.delete("/{location_id}", response_model=LocationDto)
async def delete_location(
    location_id: int,
    location_service: LocationService = Depends(),
    _=Depends(authenticate_admin),
):
    return await location_service.delete_location(location_id)
