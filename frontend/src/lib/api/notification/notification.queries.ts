import NotificationService from "@/lib/api/notification/notification.service";
import {
  SUBSCRIPTION_STATUS_KEY,
  SubscriptionStatusDto,
} from "@/lib/api/notification/notification.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const notificationService = new NotificationService();

/** Query the notification subscription status for a given token; disabled until the token is available. */
export function useSubscriptionStatus(token: string | null) {
  return useQuery<SubscriptionStatusDto, Error>({
    queryKey: SUBSCRIPTION_STATUS_KEY(token ?? ""),
    queryFn: () => notificationService.getSubscriptionStatus(token!),
    enabled: !!token,
  });
}

/**
 * Mutation to unsubscribe the token holder from email notifications.
 *
 * On success, optimistically sets `is_subscribed` to `false` in the subscription
 * status cache, avoiding a round-trip refetch.
 */
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

/**
 * Mutation to re-subscribe the token holder to email notifications.
 *
 * On success, optimistically sets `is_subscribed` to `true` in the subscription
 * status cache, avoiding a round-trip refetch.
 */
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
