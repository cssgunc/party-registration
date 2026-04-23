import {
  ListQueryParams,
  ServerTableParams,
} from "@/lib/api/shared/query-params";
import { OptimisticMutationOptions, PaginatedResponse } from "@/lib/shared";
import {
  UseQueryOptions,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRef } from "react";
import { IncidentService } from "./incident.service";
import { IncidentCreateDto, IncidentDto } from "./incident.types";

const incidentService = new IncidentService();

export const INCIDENTS_KEY = ["incidents"] as const;

export type UpdateIncidentVars = {
  id: number;
  payload: IncidentCreateDto;
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

export function useCreateIncident<TContext = unknown>(
  options?: OptimisticMutationOptions<
    IncidentDto,
    Error,
    IncidentCreateDto,
    TContext
  >
) {
  const queryClient = useQueryClient();

  return useMutation<IncidentDto, Error, IncidentCreateDto, TContext>({
    ...options,
    mutationFn: (payload: IncidentCreateDto) =>
      incidentService.createIncident(payload),

    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: INCIDENTS_KEY });
      options?.onSuccess?.(...params);
    },
  });
}

export function useUpdateIncident<TContext = unknown>(
  options?: OptimisticMutationOptions<
    IncidentDto,
    Error,
    UpdateIncidentVars,
    TContext
  >
) {
  const queryClient = useQueryClient();
  const previousByIdRef = useRef<IncidentDto | undefined>(undefined);

  return useMutation<IncidentDto, Error, UpdateIncidentVars, TContext>({
    ...options,
    mutationFn: ({ id, payload }: UpdateIncidentVars) =>
      incidentService.updateIncident(id, payload),

    onMutate: async ({ id, payload }, context) => {
      await queryClient.cancelQueries({ queryKey: INCIDENTS_KEY });

      previousByIdRef.current = queryClient.getQueryData<IncidentDto>([
        ...INCIDENTS_KEY,
        id,
      ]);

      if (previousByIdRef.current) {
        queryClient.setQueryData<IncidentDto>([...INCIDENTS_KEY, id], {
          ...previousByIdRef.current,
          ...payload,
          incident_datetime:
            payload.incident_datetime instanceof Date
              ? payload.incident_datetime
              : (previousByIdRef.current.incident_datetime ?? new Date()),
        });
        options?.onOptimisticUpdate?.({ id, payload });
      }

      return (await options?.onMutate?.({ id, payload }, context)) as TContext;
    },

    onError: (error, vars, onMutateResult, context) => {
      if (previousByIdRef.current) {
        queryClient.setQueryData(
          [...INCIDENTS_KEY, vars.id],
          previousByIdRef.current
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

export function useDeleteIncident<TContext = unknown>(
  options?: OptimisticMutationOptions<void, Error, number, TContext>
) {
  const queryClient = useQueryClient();
  const previousQueriesRef = useRef<
    ReturnType<
      typeof queryClient.getQueriesData<PaginatedResponse<IncidentDto>>
    >
  >([]);

  return useMutation<void, Error, number, TContext>({
    ...options,
    mutationFn: (id: number) => incidentService.deleteIncident(id),

    onMutate: async (id, context) => {
      await queryClient.cancelQueries({ queryKey: INCIDENTS_KEY });

      previousQueriesRef.current = queryClient.getQueriesData<
        PaginatedResponse<IncidentDto>
      >({ queryKey: INCIDENTS_KEY });

      queryClient.setQueriesData<PaginatedResponse<IncidentDto>>(
        { queryKey: INCIDENTS_KEY },
        (old) =>
          old ? { ...old, items: old.items.filter((i) => i.id !== id) } : old
      );

      options?.onOptimisticUpdate?.(id);
      return (await options?.onMutate?.(id, context)) as TContext;
    },

    onError: (error, id, onMutateResult, context) => {
      previousQueriesRef.current.forEach(([queryKey, data]) => {
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

export function useDownloadIncidentsCsv() {
  return useMutation<void, Error, ListQueryParams | undefined>({
    mutationFn: (params) => incidentService.downloadIncidentsCsv(params),
  });
}
