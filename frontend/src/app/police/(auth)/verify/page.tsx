"use client";

import AuthCard from "@/app/police/(auth)/_components/AuthCard";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { useVerifyPoliceEmail } from "@/lib/api/auth/auth.queries";
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
    onError: () => {
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
    <AuthCard
      title="Verify Police Account"
      description="We're confirming your email address."
    >
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
    </AuthCard>
  );
}
