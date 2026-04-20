"use client";

import { Button } from "@/components/ui/button";
import { useRetryPoliceVerification } from "@/lib/api/auth/auth.queries";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";

const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;
const resendCooldownFromEnv = Number.parseInt(
  process.env.NEXT_PUBLIC_POLICE_VERIFICATION_RESEND_COOLDOWN_SECONDS ?? "",
  10
);
const resendCooldownSeconds =
  Number.isFinite(resendCooldownFromEnv) && resendCooldownFromEnv >= 0
    ? resendCooldownFromEnv
    : DEFAULT_RESEND_COOLDOWN_SECONDS;

type ResendVerificationButtonProps = {
  email: string;
  initialCooldownSeconds?: number;
};

export default function ResendVerificationButton({
  email,
  initialCooldownSeconds = 0,
}: ResendVerificationButtonProps) {
  const [cooldownSeconds, setCooldownSeconds] = useState(
    initialCooldownSeconds
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const retryPoliceVerificationMutation = useRetryPoliceVerification({
    onSuccess: () => {
      setMessage("Verification email resent.");
      setCooldownSeconds(resendCooldownSeconds);
    },
    onError: (requestError: Error) => {
      if (isAxiosError(requestError)) {
        if (typeof requestError.response?.data?.detail === "string") {
          setError(requestError.response.data.detail);
        } else {
          setError("Unable to resend verification email right now.");
        }
      } else {
        setError("Unable to resend verification email right now.");
      }
    },
  });

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCooldownSeconds((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  async function handleResend() {
    setMessage(null);
    setError(null);
    retryPoliceVerificationMutation.mutate({ email });
  }

  return (
    <div className="space-y-2 text-center">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleResend}
        disabled={
          retryPoliceVerificationMutation.isPending || cooldownSeconds > 0
        }
      >
        {retryPoliceVerificationMutation.isPending
          ? "Sending..."
          : cooldownSeconds > 0
            ? `Resend Email in ${cooldownSeconds}s`
            : "Resend Email"}
      </Button>

      {message && <p className="text-sm text-foreground">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
