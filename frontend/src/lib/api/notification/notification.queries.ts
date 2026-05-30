import NotificationService from "@/lib/api/notification/notification.service";
import {
  SUBSCRIPTION_STATUS_KEY,
  SubscriptionStatusDto,
} from "@/lib/api/notification/notification.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const notificationService = new NotificationService();

export function useSubscriptionStatus(token: string | null) {
  return useQuery<SubscriptionStatusDto, Error>({
    queryKey: SUBSCRIPTION_STATUS_KEY(token ?? ""),
    queryFn: () => notificationService.getSubscriptionStatus(token!),
    enabled: !!token,
  });
}

export function useUnsubscribe(token: string | null) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () => notificationService.unsubscribe(token!),
    onSuccess: () => {
      queryClient.setQueryData<SubscriptionStatusDto>(
        SUBSCRIPTION_STATUS_KEY(token ?? ""),
        { is_subscribed: false }
      );
    },
  });
}

export function useResubscribe(token: string | null) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () => notificationService.resubscribe(token!),
    onSuccess: () => {
      queryClient.setQueryData<SubscriptionStatusDto>(
        SUBSCRIPTION_STATUS_KEY(token ?? ""),
        { is_subscribed: true }
      );
    },
  });
}
