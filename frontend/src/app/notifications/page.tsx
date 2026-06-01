"use client";

import partySamrtVertical from "@/components/icons/party_smart_logo_vertical.svg";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useResubscribe,
  useSubscriptionStatus,
  useUnsubscribe,
} from "@/lib/api/notification/notification.queries";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function NotificationsPage() {
  return (
    <Suspense>
      <NotificationsContent />
    </Suspense>
  );
}

function NotificationsContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const { data, isLoading, isError } = useSubscriptionStatus(token);
  const unsubscribe = useUnsubscribe(token);
  const resubscribe = useResubscribe(token);

  const isSubscribed = data?.is_subscribed;
  const isMutating = unsubscribe.isPending || resubscribe.isPending;
  const hasMutationError = unsubscribe.isError || resubscribe.isError;

  return (
    <main className="flex h-full items-center justify-center px-4 py-6">
      <Card className="w-full max-w-md">
        <CardHeader className="px-10 pt-8 text-center">
          <div className="flex justify-center mb-3">
            <Image
              src={partySamrtVertical}
              alt="Party Smart by OCSL"
              loading="eager"
              className="h-60 w-auto"
            />
          </div>
          <CardTitle className="text-2xl mb-2">
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Manage your party registration email notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-10 pt-4 pb-8 flex flex-col gap-6">
          {!token || isError ? (
            <p className="text-sm text-destructive text-center">
              This link is invalid or has expired. Please use the link from your
              most recent party registration email.
            </p>
          ) : isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <p className="text-sm text-center text-muted-foreground">
                {isSubscribed
                  ? "You are currently receiving party registration emails."
                  : "You are not receiving party registration emails."}
              </p>
              {hasMutationError && (
                <p className="text-sm text-destructive text-center">
                  Something went wrong. Please try again.
                </p>
              )}
              {isSubscribed ? (
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isMutating}
                  onClick={() => unsubscribe.mutate()}
                >
                  {unsubscribe.isPending ? "Unsubscribing..." : "Unsubscribe"}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  disabled={isMutating}
                  onClick={() => resubscribe.mutate()}
                >
                  {resubscribe.isPending
                    ? "Resubscribing..."
                    : "Resubscribe to emails"}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
