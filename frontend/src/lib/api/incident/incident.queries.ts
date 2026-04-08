import { ServerTableParams } from "@/lib/api/shared/query-params";
import { OptimisticMutationOptions, PaginatedResponse } from "@/lib/shared";
import {
  UseQueryOptions,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { IncidentService } from "./incident.service";
import { IncidentCreateDto, IncidentDto } from "./incident.types";

const incidentService = new IncidentService();

export const INCIDENTS_KEY = ["incidents"] as const;

type UpdateIncidentVars = {
  id: number;
  payload: Partial<IncidentCreateDto>;
};

export function useIncidents(
  params?: ServerTableParams,
  options?: UseQueryOptions<PaginatedResponse<IncidentDto>>
) {
  return useQuery({
    queryKey: [...INCIDENTS_KEY, params ?? "all"],
    queryFn: () => incidentService.listIncidents(params),
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function useIncident(
  id: number,
  options?: UseQueryOptions<IncidentDto>
) {
  return useQuery({
    queryKey: [...INCIDENTS_KEY, id],
    queryFn: () => incidentService.getIncidentById(id),
    ...options,
  });
}

export function useCreateIncident(
  options?: OptimisticMutationOptions<IncidentDto, Error, IncidentCreateDto>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (payload: IncidentCreateDto) =>
      incidentService.createIncident(payload),

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: INCIDENTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

export function useUpdateIncident(
  options?: OptimisticMutationOptions<IncidentDto, Error, UpdateIncidentVars>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: ({ id, payload }: UpdateIncidentVars) =>
      incidentService.updateIncident(id, payload),

    onMutate: async ({ id, payload }, context) => {
      await queryClient.cancelQueries({ queryKey: INCIDENTS_KEY });

      const previousById = queryClient.getQueryData<IncidentDto>([
        ...INCIDENTS_KEY,
        id,
      ]);

      if (previousById) {
        queryClient.setQueryData<IncidentDto>([...INCIDENTS_KEY, id], {
          ...previousById,
          ...payload,
          incident_datetime:
            payload.incident_datetime instanceof Date
              ? payload.incident_datetime
              : (previousById.incident_datetime ?? new Date()),
        });
        options?.onOptimisticUpdate?.({ id, payload });
      }

      await options?.onMutate?.({ id, payload }, context);
      return { previousById };
    },

    onError: (error, vars, onMutateResult, context) => {
      if (onMutateResult?.previousById) {
        queryClient.setQueryData(
          [...INCIDENTS_KEY, vars.id],
          onMutateResult.previousById
        );
      }
      options?.onError?.(error, vars, onMutateResult, context);
    },

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: INCIDENTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

export function useDeleteIncident(
  options?: OptimisticMutationOptions<void, Error, number>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (id: number) => incidentService.deleteIncident(id),

    onMutate: async (id, context) => {
      await queryClient.cancelQueries({ queryKey: INCIDENTS_KEY });

      const previousQueries = queryClient.getQueriesData<
        PaginatedResponse<IncidentDto>
      >({ queryKey: INCIDENTS_KEY });

      queryClient.setQueriesData<PaginatedResponse<IncidentDto>>(
        { queryKey: INCIDENTS_KEY },
        (old) =>
          old ? { ...old, items: old.items.filter((i) => i.id !== id) } : old
      );

      options?.onOptimisticUpdate?.(id);
      await options?.onMutate?.(id, context);
      return { previousQueries };
    },

    onError: (error, id, onMutateResult, context) => {
      onMutateResult?.previousQueries.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      options?.onError?.(error, id, onMutateResult, context);
    },

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: INCIDENTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}
