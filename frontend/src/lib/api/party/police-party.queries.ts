import { LocationService } from "@/lib/api/location/location.service";
import { AddressData } from "@/lib/api/location/location.types";
import { ServerTableParams } from "@/lib/api/shared/query-params";
import { UseQueryOptions, useQuery } from "@tanstack/react-query";
import { PartyService } from "./party.service";
import { PARTIES_KEY, PartyDto } from "./party.types";

const policeLocationService = new LocationService();
const partyService = new PartyService();

// Query key constants for police queries
const PLACE_DETAILS_KEY = ["place-details"] as const;

export function usePlaceDetails(
  placeId: string | undefined,
  options?: UseQueryOptions<AddressData>
) {
  return useQuery({
    queryKey: [...PLACE_DETAILS_KEY, placeId],
    queryFn: () => policeLocationService.getPlaceDetails(placeId!),
    enabled: !!placeId,
    ...options,
  });
}

export function usePoliceParties(
  { startDate, endDate }: { startDate?: Date; endDate?: Date },
  options?: UseQueryOptions<PartyDto[]>
) {
  return useQuery({
    queryKey: [...PARTIES_KEY, startDate, endDate],
    queryFn: async () => {
      const params: ServerTableParams = {
        page_number: 1,
        page_size: 200,
        filters: {},
      };
      if (startDate)
        params.filters.party_datetime_gte = startDate.toISOString();
      if (endDate) params.filters.party_datetime_lte = endDate.toISOString();
      const page = await partyService.listParties(params);
      return page.items;
    },
    enabled: !!startDate && !!endDate,
    ...options,
  });
}

export function usePartiesNearby(
  {
    placeId,
    startDate,
    endDate,
  }: { placeId?: string; startDate?: Date; endDate?: Date },
  options?: UseQueryOptions<PartyDto[]>
) {
  return useQuery({
    queryKey: [...PARTIES_KEY, "nearby", placeId, startDate, endDate],
    queryFn: () =>
      partyService.getPartiesNearby(placeId!, startDate!, endDate!),
    enabled: !!placeId && !!startDate && !!endDate,
    ...options,
  });
}
