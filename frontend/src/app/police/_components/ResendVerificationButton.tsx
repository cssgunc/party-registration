"use client";

import { Button } from "@/components/ui/button";
import { useRetryPoliceVerification } from "@/lib/api/auth/auth.queries";
import { clientEnv } from "@/lib/config/env.client";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";

const resendCooldownSeconds =
  clientEnv.NEXT_PUBLIC_POLICE_VERIFICATION_RESEND_COOLDOWN_SECONDS;

type ResendVerificationButtonProps = {
  email: string;
  startInCooldown?: boolean;
};

export default function ResendVerificationButton({
  email,
  startInCooldown = false,
}: ResendVerificationButtonProps) {
  const [cooldownSeconds, setCooldownSeconds] = useState(
    startInCooldown ? resendCooldownSeconds : 0
  );
  const isOnCooldown = cooldownSeconds > 0;
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
        variant={isOnCooldown ? "outline" : "default"}
        className="w-full"
        onClick={handleResend}
        disabled={retryPoliceVerificationMutation.isPending || isOnCooldown}
      >
        {retryPoliceVerificationMutation.isPending
          ? "Sending..."
          : isOnCooldown
            ? `Resend Email in ${cooldownSeconds}s`
            : "Resend Email"}
      </Button>

      {message && <p className="text-sm text-foreground">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
