from src.modules.location.location_service import LocationService, get_gmaps_client


async def main():
    svc = LocationService(get_gmaps_client())
    results = await svc.autocomplete_address("123 Main St")
    for res in results:
        print(f"{res.formatted_address} (Place ID: {res.place_id})")

    res = await svc.get_place_details("ChIJxRlu7G3krIkR9qrkuJ8TWHw")
    print(f"Details for Place ID {res.google_place_id}:")
    print(f"  Address: {res.formatted_address}")
    print(f"  Latitude: {res.latitude}, Longitude: {res.longitude}")
    print(f"  City: {res.city}, State: {res.state}, Country: {res.country}")
    print(f"  Zip Code: {res.zip_code}")
    print(f"  Street: {res.street_number} {res.street_name}")
    print(f"  Unit: {res.unit}")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
