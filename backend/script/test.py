from src.modules.location.location_service import LocationService, get_gmaps_client


async def main():
    svc = LocationService(get_gmaps_client())
    results = await svc.autocomplete_address("123 Main St")
    for res in results:
        print(f"{res.formatted_address} (Place ID: {res.place_id})")

    res = await svc.get_place_details("ChIJpXrqrufCrIkRNDWEBylUCJE")
    print(res.model_dump_json(indent=2))


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
