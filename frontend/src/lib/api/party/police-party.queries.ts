import { useCreateIncident } from "@/lib/api/incident/incident.queries";
import {
  IncidentCreateDto,
  IncidentDto,
} from "@/lib/api/incident/incident.types";
import { LocationService } from "@/lib/api/location/location.service";
import { AddressData, LocationDto } from "@/lib/api/location/location.types";
import { ServerTableParams } from "@/lib/api/shared/query-params";
import { OptimisticMutationOptions } from "@/lib/shared";
import {
  UseQueryOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { PartyService } from "./party.service";
import {
  NEARBY_KEY,
  PARTIES_KEY,
  PartyDto,
  ProximitySearchResponse,
} from "./party.types";

const policeLocationService = new LocationService();
const partyService = new PartyService();

// Query key constants for police queries
const PLACE_DETAILS_KEY = ["place-details"] as const;

type PoliceCreateIncidentContext = {
  previousData: readonly [readonly unknown[], PartyDto[] | undefined][];
  previousNearbyData: readonly [
    readonly unknown[],
    ProximitySearchResponse | undefined,
  ][];
};

function createOptimisticIncident(payload: IncidentCreateDto): IncidentDto {
  return {
    id: Date.now(),
    location_id: 0,
    incident_datetime: payload.incident_datetime,
    description: payload.description,
    severity: payload.severity,
    reference_id: payload.reference_id ?? null,
  };
}

function createOptimisticLocation(
  response: ProximitySearchResponse,
  optimisticIncident: IncidentDto
): LocationDto {
  return {
    id: 0,
    google_place_id: response.exact_match.google_place_id,
    formatted_address: response.exact_match.formatted_address,
    latitude: 0,
    longitude: 0,
    street_number: null,
    street_name: null,
    unit: null,
    city: null,
    county: null,
    state: null,
    country: null,
    zip_code: null,
    hold_expiration: null,
    incidents: [optimisticIncident],
  };
}

function addOptimisticIncidentToParty(
  party: PartyDto,
  locationPlaceId: string,
  optimisticIncident: IncidentDto
) {
  if (party.location.google_place_id !== locationPlaceId) {
    return party;
  }

  return {
    ...party,
    location: {
      ...party.location,
      incidents: [optimisticIncident, ...party.location.incidents],
    },
  };
}

function addOptimisticIncidentToNearbyResponse(
  response: ProximitySearchResponse,
  locationPlaceId: string,
  optimisticIncident: IncidentDto
): ProximitySearchResponse {
  return {
    ...response,
    exact_match: {
      ...response.exact_match,
      party: response.exact_match.party
        ? addOptimisticIncidentToParty(
            response.exact_match.party,
            locationPlaceId,
            optimisticIncident
          )
        : response.exact_match.party,
      location:
        response.exact_match.google_place_id === locationPlaceId
          ? response.exact_match.location
            ? {
                ...response.exact_match.location,
                incidents: [
                  optimisticIncident,
                  ...response.exact_match.location.incidents,
                ],
              }
            : createOptimisticLocation(response, optimisticIncident)
          : response.exact_match.location,
    },
    nearby: response.nearby.map((party) =>
      addOptimisticIncidentToParty(party, locationPlaceId, optimisticIncident)
    ),
  };
}

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
  options?: UseQueryOptions<ProximitySearchResponse>
) {
  return useQuery<ProximitySearchResponse>({
    queryKey: [...NEARBY_KEY, placeId, startDate, endDate],
    queryFn: () =>
      partyService.getPartiesNearby(placeId!, startDate!, endDate!),
    enabled: !!placeId && !!startDate && !!endDate,
    ...options,
  });
}

/* Extended Create Incident hook to optimistically update and refresh police party data */
export function usePoliceCreateIncident<TContext = unknown>(
  options?: OptimisticMutationOptions<
    IncidentDto,
    Error,
    IncidentCreateDto,
    TContext & PoliceCreateIncidentContext
  >
) {
  const queryClient = useQueryClient();

  return useCreateIncident({
    onMutate: async (payload, context) => {
      await queryClient.cancelQueries({ queryKey: PARTIES_KEY });
      await queryClient.cancelQueries({ queryKey: NEARBY_KEY });

      const previousData = queryClient.getQueriesData<PartyDto[]>({
        queryKey: PARTIES_KEY,
      });
      const previousNearbyData =
        queryClient.getQueriesData<ProximitySearchResponse>({
          queryKey: NEARBY_KEY,
        });

      const optimisticIncident = createOptimisticIncident(payload);

      queryClient.setQueriesData<PartyDto[]>(
        { queryKey: PARTIES_KEY },
        (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((party) =>
            addOptimisticIncidentToParty(
              party,
              payload.location_place_id,
              optimisticIncident
            )
          );
        }
      );

      queryClient.setQueriesData<ProximitySearchResponse>(
        { queryKey: NEARBY_KEY },
        (old) => {
          if (!old) return old;

          return addOptimisticIncidentToNearbyResponse(
            old,
            payload.location_place_id,
            optimisticIncident
          );
        }
      );

      options?.onOptimisticUpdate?.(payload);

      const result = await options?.onMutate?.(payload, context);
      return {
        ...((result ?? {}) as TContext),
        previousData,
        previousNearbyData,
      };
    },
    onError: (error, payload, onMutateResult, context) => {
      onMutateResult?.previousData.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      onMutateResult?.previousNearbyData.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      options?.onError?.(error, payload, onMutateResult, context);
    },
    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: PARTIES_KEY });
      queryClient.invalidateQueries({ queryKey: NEARBY_KEY });
      options?.onSuccess?.(...params);
    },
  });
}
