import { useCreateIncident } from "@/lib/api/incident/incident.queries";
import { IncidentDto } from "@/lib/api/incident/incident.types";
import { LocationService } from "@/lib/api/location/location.service";
import { AddressData } from "@/lib/api/location/location.types";
import { ServerTableParams } from "@/lib/api/shared/query-params";
import {
  UseQueryOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
        filters: {},
      };
      if (startDate)
        params.filters.party_datetime_gte = startDate.toISOString();
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        params.filters.party_datetime_lte = endOfDay.toISOString();
      }
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

/* Extended Create Incident hook to optimistically update and refresh party data */
export function usePoliceCreateIncident(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useCreateIncident({
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: PARTIES_KEY });

      const previousData = queryClient.getQueriesData<PartyDto[]>({
        queryKey: PARTIES_KEY,
      });

      const optimisticIncident: IncidentDto = {
        id: Date.now(),
        location_id: 0,
        incident_datetime: payload.incident_datetime,
        description: payload.description,
        severity: payload.severity,
        reference_id: payload.reference_id ?? null,
      };

      queryClient.setQueriesData<PartyDto[]>({ queryKey: PARTIES_KEY }, (old) =>
        old?.map((party) =>
          party.location.google_place_id === payload.location_place_id
            ? {
                ...party,
                location: {
                  ...party.location,
                  incidents: [optimisticIncident, ...party.location.incidents],
                },
              }
            : party
        )
      );

      return { previousData };
    },
    onError: (error: Error, _payload, onMutateResult) => {
      onMutateResult?.previousData.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      options?.onError?.(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTIES_KEY });
      options?.onSuccess?.();
    },
  });
}
