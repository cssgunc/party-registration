import asyncio

import googlemaps
from fastapi import Depends
from googlemaps import places
from src.core.config import env
from src.core.exceptions import InternalServerException

from .location_model import AutocompleteResult, LocationData


class LocationServiceException(InternalServerException):
    def __init__(self, detail: str):
        super().__init__(f"Location service error: {detail}")


def get_gmaps_client() -> googlemaps.Client:
    # Dependency injection function for Google Maps client.
    return googlemaps.Client(key=env.GOOGLE_MAPS_API_KEY)


class LocationService:
    def __init__(self, gmaps_client: googlemaps.Client = Depends(get_gmaps_client)):
        self.gmaps_client = gmaps_client

    async def autocomplete_address(self, input_text: str) -> list[AutocompleteResult]:
        # Autocomplete an address using Google Maps Places API. Biased towards Chapel Hill, NC area
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

            suggestions = []
            for prediction in autocomplete_result:
                suggestion = AutocompleteResult(
                    formatted_address=prediction["description"],
                    place_id=prediction["place_id"],
                )
                suggestions.append(suggestion)

            return suggestions

        except Exception as e:
            raise LocationServiceException(f"Failed to autocomplete address: {str(e)}")

    async def get_place_details(self, place_id: str) -> LocationData:
        # Get detailed location data for a Google Maps place ID
        # Raises LocationServiceException if the place cannot be found/API fails
        try:
            place_result = await asyncio.to_thread(
                places.place,
                self.gmaps_client,
                place_id=place_id,
                fields=["formatted_address", "geometry", "address_component"],
            )

            if "result" not in place_result:
                raise LocationServiceException(f"Place with ID {place_id} not found")

            place = place_result["result"]

            street_number = None
            street_name = None
            city = None
            county = None
            state = None
            country = None
            zip_code = None

            for component in place.get("address_component", []):
                types = component["types"]
                if "street_number" in types:
                    street_number = component["long_name"]
                elif "route" in types:
                    street_name = component["long_name"]
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
                raise LocationServiceException(
                    f"No geometry data found for place ID {place_id}"
                )

            return LocationData(
                google_place_id=place_id,
                formatted_address=place.get("formatted_address", ""),
                latitude=location.get("lat", 0.0),
                longitude=location.get("lng", 0.0),
                street_number=street_number,
                street_name=street_name,
                city=city,
                county=county,
                state=state,
                country=country,
                zip_code=zip_code,
            )

        except LocationServiceException:
            raise
        except Exception as e:
            raise LocationServiceException(f"Failed to get place details: {str(e)}")
