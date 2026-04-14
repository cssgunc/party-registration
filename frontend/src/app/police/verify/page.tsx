"use client";

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
      <section
        className="w-full max-w-md"
        aria-labelledby="police-verify-title"
      >
        <Card className="max-w-none">
          <CardHeader className="px-6 pt-6 text-center">
            <CardTitle id="police-verify-title" className="text-2xl">
              Verify Police Account
            </CardTitle>
            <CardDescription>
              We&apos;re confirming your email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {isLoading && (
              <p className="text-center text-sm text-muted-foreground">
                Verifying your account...
              </p>
            )}

            {isSuccess && (
              <div className="space-y-4 text-center">
                <p className="text-sm text-foreground">
                  Your email has been verified. You can now sign in to the
                  police portal.
                </p>
                <Button asChild className="w-full">
                  <Link href="/login/police">Go to Police Login</Link>
                </Button>
              </div>
            )}

            {hasError && (
              <div className="space-y-4 text-center">
                <p className="text-sm text-destructive">{errorMessage}</p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login/police">Back to Police Login</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
