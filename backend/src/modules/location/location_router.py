from fastapi import APIRouter, Depends, HTTPException, status
from src.core.authentication import (
    authenticate_admin,
    authenticate_staff_or_admin,
    authenticate_user,
)
from src.modules.account.account_model import Account
from src.modules.location.location_model import (
    Location,
    LocationCreate,
    LocationData,
    PaginatedLocationResponse,
)
from src.modules.location.location_service import LocationService

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
    user: Account = Depends(authenticate_user),
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
        )
    except Exception:
        # Log error in production
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch address suggestions. Please try again later.",
        )


@location_router.get("/", response_model=PaginatedLocationResponse)
async def get_locations(
    location_service: LocationService = Depends(),
    _=Depends(authenticate_staff_or_admin),
):
    locations = await location_service.get_locations()
    return PaginatedLocationResponse(
        items=locations,
        total_records=len(locations),
        page_number=1,
        page_size=len(locations),
        total_pages=1,
    )


@location_router.get("/{location_id}", response_model=Location)
async def get_location(
    location_id: int,
    location_service: LocationService = Depends(),
    _=Depends(authenticate_staff_or_admin),
):
    return await location_service.get_location_by_id(location_id)


@location_router.post("/", status_code=201, response_model=Location)
async def create_location(
    data: LocationCreate,
    location_service: LocationService = Depends(),
    _=Depends(authenticate_admin),
):
    address_data = await location_service.get_place_details(data.google_place_id)
    return await location_service.create_location(
        LocationData.from_address(
            address_data,
            warning_count=data.warning_count,
            citation_count=data.citation_count,
            hold_expiration=data.hold_expiration,
        )
    )


@location_router.put("/{location_id}", response_model=Location)
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
            warning_count=data.warning_count,
            citation_count=data.citation_count,
            hold_expiration=data.hold_expiration,
        )
    else:
        location_data = LocationData(
            **location.model_dump(
                exclude={"warning_count", "citation_count", "hold_expiration"}
            ),
            warning_count=data.warning_count,
            citation_count=data.citation_count,
            hold_expiration=data.hold_expiration,
        )

    return await location_service.update_location(location_id, location_data)


@location_router.delete("/{location_id}", response_model=Location)
async def delete_location(
    location_id: int,
    location_service: LocationService = Depends(),
    _=Depends(authenticate_admin),
):
    return await location_service.delete_location(location_id)
