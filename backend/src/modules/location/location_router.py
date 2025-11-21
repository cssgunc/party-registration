from fastapi import APIRouter, Depends, HTTPException, Query, status
from src.core.authentication import (
    authenticate_admin,
    authenticate_by_role,
    authenticate_staff_or_admin,
)
from src.modules.account.account_model import Account
from src.modules.location.location_model import (
    AddressData,
    Location,
    LocationCreate,
    LocationData,
    PaginatedLocationResponse,
)
from src.modules.location.location_service import LocationService
from src.modules.police.police_model import PoliceAccount

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
    user: Account | PoliceAccount = Depends(
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
        )
    except Exception:
        # Log error in production
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch address suggestions. Please try again later.",
        )


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
    user: Account | PoliceAccount = Depends(
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
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch place details. Please try again later.",
        )


@location_router.get("/", response_model=PaginatedLocationResponse)
async def get_locations(
    page: int | None = Query(default=None, ge=1),
    size: int | None = Query(default=None, ge=1),
    location_service: LocationService = Depends(),
    _=Depends(authenticate_staff_or_admin),
):
    locations = await location_service.get_locations()

    total = len(locations)

    # default — return everything
    if page is None or size is None:
        return PaginatedLocationResponse(
            items=locations,
            total_records=total,
            page_number=1,
            page_size=total,
            total_pages=1,
        )

    start = (page - 1) * size
    end = start + size
    sliced = locations[start:end]

    total_pages = (total + size - 1) // size if total > 0 else 1

    return PaginatedLocationResponse(
        items=sliced,
        total_records=total,
        page_number=page,
        page_size=size,
        total_pages=total_pages,
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
