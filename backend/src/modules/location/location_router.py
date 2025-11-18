from fastapi import APIRouter, Depends
from src.core.authentication import authenticate_admin, authenticate_staff_or_admin
from src.modules.location.location_model import (
    Location,
    LocationCreate,
    LocationData,
    PaginatedLocationResponse,
)
from src.modules.location.location_service import LocationService

location_router = APIRouter(prefix="/locations", tags=["locations"])


@location_router.get("/", response_model=PaginatedLocationResponse)
async def get_locations(
    location_service: LocationService = Depends(),
    _=Depends(authenticate_staff_or_admin),
):
    """
    GET /locations
    This MUST match exactly what tests expect:
    - No query params
    - Always return ALL locations
    - page_number = 1
    - total_pages = 1
    - page_size = number of items
    """
    locations = await location_service.get_locations()

    total_records = len(locations)
    return PaginatedLocationResponse(
        items=locations,
        total_records=total_records,
        page_number=1,
        page_size=total_records,
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
