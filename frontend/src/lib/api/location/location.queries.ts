import { OptimisticMutationOptions, PaginatedResponse } from "@/lib/shared";
import {
  UseQueryOptions,
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
  search?: string,
  options?: UseQueryOptions<PaginatedResponse<LocationDto>>
) {
  return useQuery({
    queryKey: [...LOCATIONS_KEY, { search }],
    queryFn: () => locationService.getLocations(search),
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

    onMutate: async (id, context) => {
      await queryClient.cancelQueries({ queryKey: LOCATIONS_KEY });

      const previous =
        queryClient.getQueryData<PaginatedResponse<LocationDto>>(LOCATIONS_KEY);

      queryClient.setQueryData<PaginatedResponse<LocationDto>>(
        LOCATIONS_KEY,
        (old) => old && { ...old, items: old.items.filter((l) => l.id !== id) }
      );
      options?.onOptimisticUpdate?.(id);

      await options?.onMutate?.(id, context);
      return { previous };
    },

    onError: (error, id, onMutateResult, context) => {
      if (onMutateResult?.previous) {
        queryClient.setQueryData(LOCATIONS_KEY, onMutateResult.previous);
      }
      options?.onError?.(error, id, onMutateResult, context);
    },

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: LOCATIONS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}
