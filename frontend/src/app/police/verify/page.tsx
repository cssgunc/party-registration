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
import { useVerifyPoliceEmail } from "@/lib/api/auth/auth.queries";
import { isAxiosError } from "axios";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

export default function PoliceVerifyPage() {
  return (
    <Suspense>
      <PoliceVerifyContent />
    </Suspense>
  );
}

function PoliceVerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const fallbackErrorMessage =
    "This verification link is invalid or has expired. Please try logging in to request a new link, or contact OCSL for help.";
  const [errorMessage, setErrorMessage] = useState(fallbackErrorMessage);
  const hasAttemptedRef = useRef(false);
  const verifyPoliceEmailMutation = useVerifyPoliceEmail({
    onError: (error: Error) => {
      if (
        isAxiosError(error) &&
        typeof error.response?.data?.detail === "string"
      ) {
        setErrorMessage(
          `${error.response.data.detail}. Please try logging in to request a new link, or contact OCSL for help.`
        );
        return;
      }

      setErrorMessage(fallbackErrorMessage);
    },
  });
  const { isError, isPending, isSuccess, mutate } = verifyPoliceEmailMutation;

  useEffect(() => {
    if (!token || hasAttemptedRef.current) {
      return;
    }

    hasAttemptedRef.current = true;
    mutate({ token });
  }, [token, mutate]);

  const isLoading = !!token && isPending;
  const hasError = !token || isError;

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
          <CardTitle id="police-verify-title" className="text-2xl mb-2">
            Verify Police Account
          </CardTitle>
          <CardDescription>
            We&apos;re confirming your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-10 pt-8 pb-8 flex flex-col gap-8">
          <div className="text-center">
            {isLoading && (
              <p className="text-sm text-muted-foreground">
                Verifying your account...
              </p>
            )}
            {isSuccess && (
              <p className="text-sm text-foreground">
                Your email has been verified. You can now sign in to the police
                portal.
              </p>
            )}
            {hasError && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}
          </div>
          {(isSuccess || hasError) && (
            <Button
              asChild
              className="w-full"
              variant={hasError ? "outline" : "default"}
            >
              <Link href="/police/login">
                {isSuccess ? "Go to Police Login" : "Back to Police Login"}
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
