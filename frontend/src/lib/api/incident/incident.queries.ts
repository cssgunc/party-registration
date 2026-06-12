import {
  ListQueryParams,
  ServerTableParams,
} from "@/lib/api/shared/query-params";
import { OptimisticMutationOptions } from "@/lib/shared";
import {
  UseQueryOptions,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { IncidentService } from "./incident.service";
import {
  IncidentCreateDto,
  IncidentDto,
  PaginatedIncidentsResponse,
} from "./incident.types";

const incidentService = new IncidentService();

export const INCIDENTS_KEY = ["incidents"] as const;

export type UpdateIncidentVars = {
  id: number;
  payload: IncidentCreateDto;
};

export function useIncidents(
  params?: ServerTableParams,
  options?: UseQueryOptions<PaginatedIncidentsResponse>
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

  // Combine our rollback snapshot with the consumer's onMutate result so both
  // ride the per-invocation context channel
  type MutationContext = {
    previous: IncidentDto | undefined;
    consumer: TContext;
  };

  return useMutation<IncidentDto, Error, UpdateIncidentVars, MutationContext>({
    ...options,
    mutationFn: ({ id, payload }: UpdateIncidentVars) =>
      incidentService.updateIncident(id, payload),

    onMutate: async ({ id, payload }, context) => {
      await queryClient.cancelQueries({ queryKey: INCIDENTS_KEY });

      const previous = queryClient.getQueryData<IncidentDto>([
        ...INCIDENTS_KEY,
        id,
      ]);

      if (previous) {
        queryClient.setQueryData<IncidentDto>([...INCIDENTS_KEY, id], {
          ...previous,
          ...payload,
          incident_datetime:
            payload.incident_datetime instanceof Date
              ? payload.incident_datetime
              : (previous.incident_datetime ?? new Date()),
        });
        options?.onOptimisticUpdate?.({ id, payload });
      }

      const consumer = (await options?.onMutate?.(
        { id, payload },
        context
      )) as TContext;
      return { previous, consumer };
    },

    onError: (error, vars, onMutateResult, context) => {
      if (onMutateResult?.previous) {
        queryClient.setQueryData(
          [...INCIDENTS_KEY, vars.id],
          onMutateResult.previous
        );
      }
      options?.onError?.(error, vars, onMutateResult?.consumer, context);
    },

    onSuccess: (data, vars, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: INCIDENTS_KEY });
      options?.onSuccess?.(data, vars, onMutateResult.consumer, context);
    },

    onSettled: (data, error, vars, onMutateResult, context) => {
      options?.onSettled?.(
        data,
        error,
        vars,
        onMutateResult?.consumer,
        context
      );
    },
  });
}

export function useDeleteIncident<TContext = unknown>(
  options?: OptimisticMutationOptions<void, Error, number, TContext>
) {
  const queryClient = useQueryClient();

  type MutationContext = {
    previous: ReturnType<
      typeof queryClient.getQueriesData<PaginatedIncidentsResponse>
    >;
    consumer: TContext;
  };

  return useMutation<void, Error, number, MutationContext>({
    ...options,
    mutationFn: (id: number) => incidentService.deleteIncident(id),

    onMutate: async (id, context) => {
      await queryClient.cancelQueries({ queryKey: INCIDENTS_KEY });

      const previous = queryClient.getQueriesData<PaginatedIncidentsResponse>({
        queryKey: INCIDENTS_KEY,
      });

      queryClient.setQueriesData<PaginatedIncidentsResponse>(
        { queryKey: INCIDENTS_KEY },
        (old) =>
          old ? { ...old, items: old.items.filter((i) => i.id !== id) } : old
      );

      options?.onOptimisticUpdate?.(id);
      const consumer = (await options?.onMutate?.(id, context)) as TContext;
      return { previous, consumer };
    },

    onError: (error, id, onMutateResult, context) => {
      onMutateResult?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      options?.onError?.(error, id, onMutateResult?.consumer, context);
    },

    onSuccess: (data, id, onMutateResult, context) => {
      queryClient.invalidateQueries({ queryKey: INCIDENTS_KEY });
      options?.onSuccess?.(data, id, onMutateResult.consumer, context);
    },

    onSettled: (data, error, id, onMutateResult, context) => {
      options?.onSettled?.(data, error, id, onMutateResult?.consumer, context);
    },
  });
}

export function useDownloadIncidentsCsv() {
  return useMutation<void, Error, ListQueryParams | undefined>({
    mutationFn: (params) => incidentService.downloadIncidentsCsv(params),
  });
}
