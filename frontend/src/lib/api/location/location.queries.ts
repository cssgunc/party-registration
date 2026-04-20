import {
  UpdateIncidentVars,
  useDeleteIncident,
  useUpdateIncident,
} from "@/lib/api/incident/incident.queries";
import { ListQueryParams } from "@/lib/api/shared/query-params";
import { OptimisticMutationOptions, PaginatedResponse } from "@/lib/shared";
import {
  QueryKey,
  UseQueryOptions,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { LocationService } from "./location.service";
import { IncidentDto, LocationCreate, LocationDto } from "./location.types";

const locationService = new LocationService();

export const LOCATIONS_KEY = ["locations"] as const;

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

export function useDeleteLocation(
  options?: OptimisticMutationOptions<LocationDto, Error, number>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (id: number) => locationService.deleteLocation(id),

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: LOCATIONS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

type LocationsSnapshot = [
  QueryKey,
  PaginatedResponse<LocationDto> | undefined,
][];

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

      queryClient.setQueriesData<PaginatedResponse<LocationDto>>(
        { queryKey: LOCATIONS_KEY },
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((loc) => ({
                  ...loc,
                  incidents: loc.incidents.map((inc) =>
                    inc.id === vars.id ? { ...inc, ...vars.payload } : inc
                  ),
                })),
              }
            : old
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

      queryClient.setQueriesData<PaginatedResponse<LocationDto>>(
        { queryKey: LOCATIONS_KEY },
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((loc) => ({
                  ...loc,
                  incidents: loc.incidents.filter((inc) => inc.id !== id),
                })),
              }
            : old
      );

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
