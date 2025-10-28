import os
from typing import Any, List

import googlemaps
from googlemaps import places

from .location_model import AutocompleteResult, LocationData


class LocationService:
    def __init__(self, gmaps_client: Any | None = None):
        if gmaps_client is None:
            api_key = os.getenv("GOOGLE_MAPS_API_KEY")
            if not api_key:
                raise ValueError("GOOGLE_MAPS_API_KEY environment variable is required")
            self.gmaps_client = googlemaps.Client(key=api_key)
        else:
            self.gmaps_client = gmaps_client

    def autocomplete_address(self, input_text: str) -> List[AutocompleteResult]:
        try:
            autocomplete_result = places.places_autocomplete(
                self.gmaps_client, input_text=input_text, types="address", language="en"
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
            print(f"Error fetching autocomplete suggestions: {e}")
            return []

    def get_place_details(self, place_id: str) -> LocationData | None:
        try:
            place_result = places.place(
                self.gmaps_client,
                place_id=place_id,
                fields=["formatted_address", "geometry", "address_components"],
            )

            if "result" not in place_result:
                return None

            place = place_result["result"]

            street_number = None
            street_name = None
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

        except Exception as e:
            print(f"Error fetching place details: {e}")
            return None
