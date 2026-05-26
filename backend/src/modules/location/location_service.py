import asyncio
from contextlib import contextmanager
from datetime import datetime
from typing import ClassVar

import googlemaps
from fastapi import Depends
from googlemaps import places
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import env
from src.core.database import get_session
from src.core.exceptions import (
    BadRequestException,
    ConflictException,
    InternalServerException,
    NotFoundException,
)
from src.core.utils.excel_utils import export_to_excel
from src.core.utils.query_utils import (
    ListQueryParams,
    QueryFieldSet,
    QueryService,
    SortOrder,
    SortParam,
)
from src.modules.incident.incident_entity import IncidentEntity
from src.modules.incident.incident_model import IncidentSeverity

from .location_base_model import AddressData
from .location_entity import LocationEntity
from .location_model import (
    AutocompleteResult,
    LocationData,
    LocationDto,
    PaginatedLocationResponse,
)


class GoogleMapsAPIException(InternalServerException):
    def __init__(self, detail: str):
        super().__init__(f"Google Maps API error: {detail}")


@contextmanager
def _googlemaps_error_handler(fallback_msg: str):
    try:
        yield
    except (PlaceNotFoundException, InvalidPlaceIdException, GoogleMapsAPIException):
        raise
    except googlemaps.exceptions.Timeout as e:
        raise GoogleMapsAPIException(f"Request timed out: {e!s}") from e
    except googlemaps.exceptions.HTTPError as e:
        raise GoogleMapsAPIException(f"HTTP error: {e!s}") from e
    except googlemaps.exceptions.TransportError as e:
        raise GoogleMapsAPIException(f"Transport error: {e!s}") from e
    except Exception as e:
        raise GoogleMapsAPIException(f"{fallback_msg}: {e!s}") from e


class PlaceNotFoundException(NotFoundException):
    def __init__(self, place_id: str):
        super().__init__(f"Place with ID {place_id} not found")


class InvalidPlaceIdException(BadRequestException):
    def __init__(self, place_id: str):
        super().__init__(f"Invalid place ID: {place_id}")


class LocationNotFoundException(NotFoundException):
    def __init__(self, location_id: int | None = None, google_place_id: str | None = None):
        if location_id is not None and google_place_id is not None:
            raise ValueError("Provide either location_id or place_id, not both")
        if location_id is not None:
            super().__init__(f"Location with ID {location_id} not found")
        elif google_place_id is not None:
            super().__init__(f"Location with Google Place ID {google_place_id} not found")


class LocationConflictException(ConflictException):
    def __init__(self, google_place_id: str):
        super().__init__(f"Location with Google Place ID {google_place_id} already exists")


class LocationHoldActiveException(BadRequestException):
    def __init__(self, location_id: int, hold_expiration: datetime):
        super().__init__(
            f"Location {location_id} has an active hold until {hold_expiration.isoformat()}"
        )


def get_gmaps_client() -> googlemaps.Client:
    # Dependency injection function for Google Maps client.
    return googlemaps.Client(key=env.GOOGLE_MAPS_API_KEY)


def _incident_count_subquery(severity: IncidentSeverity | None = None):
    q = select(func.count()).where(IncidentEntity.location_id == LocationEntity.id)
    if severity is not None:
        q = q.where(IncidentEntity.severity == severity)
    return q.scalar_subquery()


_LOCATION_QUERY_FIELDS = QueryFieldSet(
    fields={
        "id": LocationEntity.id,
        "google_place_id": LocationEntity.google_place_id,
        "formatted_address": LocationEntity.formatted_address,
        "latitude": LocationEntity.latitude,
        "longitude": LocationEntity.longitude,
        "street_number": LocationEntity.street_number,
        "street_name": LocationEntity.street_name,
        "unit": LocationEntity.unit,
        "city": LocationEntity.city,
        "county": LocationEntity.county,
        "state": LocationEntity.state,
        "country": LocationEntity.country,
        "zip_code": LocationEntity.zip_code,
        "hold_expiration": LocationEntity.hold_expiration,
        "incident_count": _incident_count_subquery(),
        "remote_warning_count": _incident_count_subquery(IncidentSeverity.REMOTE_WARNING),
        "in_person_warning_count": _incident_count_subquery(IncidentSeverity.IN_PERSON_WARNING),
        "citation_count": _incident_count_subquery(IncidentSeverity.CITATION),
    },
    searchable=(
        "formatted_address",
        "google_place_id",
        "street_number",
        "street_name",
        "unit",
        "city",
        "county",
        "state",
        "country",
        "zip_code",
    ),
    default_sort=SortParam(field="formatted_address", order=SortOrder.ASC),
)


class LocationService:
    QUERY_FIELDS: ClassVar[QueryFieldSet] = _LOCATION_QUERY_FIELDS

    def __init__(
        self,
        gmaps_client: googlemaps.Client = Depends(get_gmaps_client),
        session: AsyncSession = Depends(get_session),
        query_service: QueryService = Depends(),
    ):
        self.session = session
        self.gmaps_client = gmaps_client
        self.query_service = query_service

    async def _get_location_entity_by_id(self, location_id: int) -> LocationEntity:
        result = await self.session.execute(
            select(LocationEntity).where(LocationEntity.id == location_id)
        )
        location_entity = result.scalar_one_or_none()
        if location_entity is None:
            raise LocationNotFoundException(location_id)
        return location_entity

    async def _get_location_entity_by_place_id(self, google_place_id: str) -> LocationEntity:
        result = await self.session.execute(
            select(LocationEntity).where(LocationEntity.google_place_id == google_place_id)
        )
        location_entity = result.scalar_one_or_none()
        if location_entity is None:
            raise LocationNotFoundException(google_place_id=google_place_id)
        return location_entity

    async def get_locations_paginated(self, params: ListQueryParams) -> "PaginatedLocationResponse":
        """
        Get locations with server-side pagination and sorting.

        Query parameters are automatically parsed from the request:
        - page_number: Page number (1-indexed, default: 1)
        - page_size: Items per page (default: all)
        - sort_by: Field to sort by
        - sort_order: Sort order ('asc' or 'desc')

        Returns:
            PaginatedLocationResponse with items and metadata
        """
        # Build base query
        base_query = select(LocationEntity)

        result = await self.query_service.get_paginated(
            params=params,
            base_query=base_query,
            field_set=_LOCATION_QUERY_FIELDS,
        )
        return PaginatedLocationResponse(**result.model_dump())

    def export_locations_to_excel(self, locations_response: PaginatedLocationResponse) -> bytes:
        return export_to_excel(
            resource_name="Locations",
            field_map={
                "Address": lambda loc: loc.formatted_address,
                "Remote Warning Count": lambda loc: sum(
                    1 for i in loc.incidents if i.severity == IncidentSeverity.REMOTE_WARNING
                ),
                "In-Person Warning Count": lambda loc: sum(
                    1 for i in loc.incidents if i.severity == IncidentSeverity.IN_PERSON_WARNING
                ),
                "Citation Count": lambda loc: sum(
                    1 for i in loc.incidents if i.severity == IncidentSeverity.CITATION
                ),
            },
            items=locations_response.items,
        )

    async def get_location_by_id(self, location_id: int) -> LocationDto:
        location_entity = await self._get_location_entity_by_id(location_id)
        return location_entity.to_dto()

    async def get_location_by_place_id(self, google_place_id: str) -> LocationDto:
        location_entity = await self._get_location_entity_by_place_id(google_place_id)
        return location_entity.to_dto()

    async def create_location(self, data: LocationData) -> LocationDto:
        new_location = LocationEntity.from_data(data)
        try:
            self.session.add(new_location)
            await self.session.commit()
        except IntegrityError as e:
            await self.session.rollback()
            raise LocationConflictException(data.google_place_id) from e
        await self.session.refresh(new_location)
        return new_location.to_dto()

    async def create_location_from_place_id(self, place_id: str) -> LocationDto:
        address_data = await self.get_place_details(place_id)
        location_data = LocationData.from_address(address_data)
        return await self.create_location(location_data)

    async def get_or_create_location(self, place_id: str) -> LocationDto:
        """Get existing location by place_id, or create it if it doesn't exist."""
        # Try to get existing location
        try:
            location = await self.get_location_by_place_id(place_id)
        except LocationNotFoundException:
            location = await self.create_location_from_place_id(place_id)

        return location

    async def update_location(self, location_id: int, data: LocationData) -> LocationDto:
        location_entity = await self._get_location_entity_by_id(location_id)

        for key, value in data.model_dump().items():
            if key == "id":
                continue
            if hasattr(location_entity, key):
                setattr(location_entity, key, value)

        try:
            self.session.add(location_entity)
            await self.session.commit()
        except IntegrityError as e:
            await self.session.rollback()
            raise LocationConflictException(data.google_place_id) from e
        await self.session.refresh(location_entity)
        return location_entity.to_dto()

    async def delete_location(self, location_id: int) -> LocationDto:
        location_entity = await self._get_location_entity_by_id(location_id)
        location = location_entity.to_dto()
        await self.session.delete(location_entity)
        await self.session.commit()
        return location

    async def autocomplete_address(self, input_text: str) -> list[AutocompleteResult]:
        # Autocomplete an address using Google Maps Places API. Biased towards Chapel Hill, NC area
        with _googlemaps_error_handler("Failed to autocomplete address"):
            try:
                autocomplete_result = await asyncio.to_thread(
                    places.places_autocomplete,
                    self.gmaps_client,
                    input_text=input_text,
                    types="address",
                    language="en",
                    location=(35.9132, -79.0558),  # Chapel Hill, NC coordinates
                    radius=50000,  # 50km radius around Chapel Hill
                )
            except googlemaps.exceptions.ApiError as e:
                raise GoogleMapsAPIException(f"API error ({e.status}): {e!s}") from e

            suggestions = []
            for prediction in autocomplete_result:
                suggestion = AutocompleteResult(
                    formatted_address=prediction["description"],
                    google_place_id=prediction["place_id"],
                )
                suggestions.append(suggestion)

            return suggestions

    async def get_place_details(self, place_id: str) -> AddressData:
        """
        Get detailed location data for a Google Maps place ID
        Raises PlaceNotFoundException if the place cannot be found
        Raises InvalidPlaceIdException if the place ID format is invalid
        Raises GoogleMapsAPIException for other API errors
        """
        with _googlemaps_error_handler("Failed to get place details"):
            try:
                place_result = await asyncio.to_thread(
                    places.place,
                    self.gmaps_client,
                    place_id=place_id,
                    fields=["formatted_address", "geometry", "address_component"],
                )
            except googlemaps.exceptions.ApiError as e:
                if e.status == "NOT_FOUND":
                    raise PlaceNotFoundException(place_id) from e
                elif e.status == "INVALID_REQUEST":
                    raise InvalidPlaceIdException(place_id) from e
                else:
                    raise GoogleMapsAPIException(f"API error ({e.status}): {e!s}") from e

            if "result" not in place_result:
                raise PlaceNotFoundException(place_id)

            place = place_result["result"]

            street_number = None
            street_name = None
            unit = None
            city = None
            county = None
            state = None
            country = None
            zip_code = None

            for component in place.get("address_components", []):
                types = component["types"]
                if "street_number" in types:
                    street_number = component["long_name"]
                elif "route" in types:
                    street_name = component["long_name"]
                elif "subpremise" in types:
                    unit = component["long_name"]
                elif "locality" in types:
                    city = component["long_name"]
                elif "administrative_area_level_2" in types:
                    county = component["long_name"]
                elif "administrative_area_level_1" in types:
                    state = component["short_name"]
                elif "country" in types:
                    country = component["short_name"]
                elif "postal_code" in types:
                    zip_code = component["long_name"]

            geometry = place.get("geometry", {})
            location = geometry.get("location", {})

            if not location:
                raise GoogleMapsAPIException(f"No geometry data found for place ID {place_id}")

            return AddressData(
                google_place_id=place_id,
                formatted_address=place.get("formatted_address", ""),
                latitude=location.get("lat", 0.0),
                longitude=location.get("lng", 0.0),
                street_number=street_number,
                street_name=street_name,
                unit=unit,
                city=city,
                county=county,
                state=state,
                country=country,
                zip_code=zip_code,
            )
