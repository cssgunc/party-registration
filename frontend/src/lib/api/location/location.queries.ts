import { ServerTableParams } from "@/lib/api/shared/query-params";
import { OptimisticMutationOptions, PaginatedResponse } from "@/lib/shared";
import {
  UseQueryOptions,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { LocationService } from "./location.service";
import { LocationCreate, LocationDto } from "./location.types";

const locationService = new LocationService();

export const LOCATIONS_KEY = ["locations"] as const;

type UpdateLocationVars = {
  id: number;
  payload: LocationCreate;
};

export function useLocations(
  serverParams?: ServerTableParams,
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
