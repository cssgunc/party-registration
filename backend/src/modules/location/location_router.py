from fastapi import APIRouter, Depends, Query
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
