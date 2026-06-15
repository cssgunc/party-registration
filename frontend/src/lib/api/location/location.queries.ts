import {
  UpdateIncidentVars,
  useCreateIncident,
  useDeleteIncident,
  useUpdateIncident,
} from "@/lib/api/incident/incident.queries";
import {
  IncidentCreateDto,
  IncidentDto,
  NestedIncidentDto,
} from "@/lib/api/incident/incident.types";
import { ListQueryParams } from "@/lib/api/shared/query-params";
import { OptimisticMutationOptions, PaginatedResponse } from "@/lib/shared";
import {
  QueryClient,
  QueryKey,
  UseQueryOptions,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { compareAsc } from "date-fns";
import { LocationService } from "./location.service";
import { LocationCreate, LocationDto } from "./location.types";

const locationService = new LocationService();

export const LOCATIONS_KEY = ["locations"] as const;

function setLocationsCache(
  queryClient: QueryClient,
  updateLocation: (loc: LocationDto) => LocationDto
) {
  queryClient.setQueriesData<PaginatedResponse<LocationDto>>(
    { queryKey: LOCATIONS_KEY },
    (old) => (old ? { ...old, items: old.items.map(updateLocation) } : old)
  );
}

type UpdateLocationVars = {
  id: number;
  payload: LocationCreate;
};

export function useLocations(
  serverParams?: ListQueryParams,
  options?: UseQueryOptions<PaginatedResponse<LocationDto>>
) {
  return useQuery({
    queryKey: [...LOCATIONS_KEY, serverParams ?? "all"],
    queryFn: () => locationService.getLocations(serverParams),
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function useCreateLocation(
  options?: OptimisticMutationOptions<LocationDto, Error, LocationCreate>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (payload: LocationCreate) =>
      locationService.createLocation(payload),

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: LOCATIONS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

export function useUpdateLocation(
  options?: OptimisticMutationOptions<LocationDto, Error, UpdateLocationVars>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: ({ id, payload }: UpdateLocationVars) =>
      locationService.updateLocation(id, payload),

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: LOCATIONS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

export function useDownloadLocationsCsv() {
  return useMutation<void, Error, ListQueryParams | undefined>({
    mutationFn: (params) => locationService.downloadLocationsCsv(params),
  });
}

type LocationsSnapshot = [
  QueryKey,
  PaginatedResponse<LocationDto> | undefined,
][];

export function useCreateIncidentInLocation(
  options?: OptimisticMutationOptions<
    IncidentDto,
    Error,
    IncidentCreateDto,
    { previousLocations: LocationsSnapshot }
  >
) {
  const queryClient = useQueryClient();

  return useCreateIncident({
    ...options,
    onMutate: async (vars, context) => {
      await queryClient.cancelQueries({ queryKey: LOCATIONS_KEY });

      const previousLocations = queryClient.getQueriesData<
        PaginatedResponse<LocationDto>
      >({ queryKey: LOCATIONS_KEY });

      const optimisticIncident: NestedIncidentDto = {
        id: -Date.now(),
        incident_datetime: vars.incident_datetime,
        description: vars.description,
        severity: vars.severity,
        reference_id: vars.reference_id,
      };

      setLocationsCache(queryClient, (loc) =>
        loc.google_place_id === vars.location_place_id
          ? {
              ...loc,
              // Keep incidents ordered earliest-first to match the backend's
              // `order_by` so the optimistic entry lands in its final position.
              incidents: [...loc.incidents, optimisticIncident].sort((a, b) =>
                compareAsc(a.incident_datetime, b.incident_datetime)
              ),
            }
          : loc
      );

      await options?.onMutate?.(vars, context);
      return { previousLocations };
    },
    onError: (error, vars, onMutateResult, context) => {
      onMutateResult?.previousLocations.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      options?.onError?.(error, vars, onMutateResult, context);
    },
    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: LOCATIONS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

export function useUpdateIncidentInLocation(
  options?: OptimisticMutationOptions<
    IncidentDto,
    Error,
    UpdateIncidentVars,
    { previousLocations: LocationsSnapshot }
  >
) {
  const queryClient = useQueryClient();

  return useUpdateIncident({
    ...options,
    onMutate: async (vars, context) => {
      await queryClient.cancelQueries({ queryKey: LOCATIONS_KEY });

      const previousLocations = queryClient.getQueriesData<
        PaginatedResponse<LocationDto>
      >({ queryKey: LOCATIONS_KEY });

      setLocationsCache(queryClient, (loc) => ({
        ...loc,
        incidents: loc.incidents.map((inc) =>
          inc.id === vars.id ? { ...inc, ...vars.payload } : inc
        ),
      }));

      await options?.onMutate?.(vars, context);
      return { previousLocations };
    },
    onError: (error, vars, onMutateResult, context) => {
      onMutateResult?.previousLocations.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      options?.onError?.(error, vars, onMutateResult, context);
    },
    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: LOCATIONS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

type DeleteLocationsSnapshot = [
  QueryKey,
  PaginatedResponse<LocationDto> | undefined,
][];

export function useDeleteIncidentInLocation(
  options?: OptimisticMutationOptions<
    void,
    Error,
    number,
    { previousLocations: DeleteLocationsSnapshot }
  >
) {
  const queryClient = useQueryClient();

  return useDeleteIncident({
    ...options,
    onMutate: async (id, context) => {
      await queryClient.cancelQueries({ queryKey: LOCATIONS_KEY });

      const previousLocations = queryClient.getQueriesData<
        PaginatedResponse<LocationDto>
      >({ queryKey: LOCATIONS_KEY });

      setLocationsCache(queryClient, (loc) => ({
        ...loc,
        incidents: loc.incidents.filter((inc) => inc.id !== id),
      }));

      await options?.onMutate?.(id, context);
      return { previousLocations };
    },
    onError: (error, id, onMutateResult, context) => {
      onMutateResult?.previousLocations.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      options?.onError?.(error, id, onMutateResult, context);
    },
    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: LOCATIONS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}
