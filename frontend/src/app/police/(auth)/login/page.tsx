"use client";

import AuthCard from "@/app/police/(auth)/_components/AuthCard";
import ResendVerificationButton from "@/app/police/(auth)/_components/ResendVerificationButton";
import { SubmitButton } from "@/components/form/SubmitButton";
import { PasswordField, TextField } from "@/components/form/fields";
import { CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { usePoliceLogin } from "@/lib/api/auth/auth.queries";
import { clientEnv } from "@/lib/config/env.client";
import { getErrorMessage } from "@/lib/errors";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const policeLoginSchema = z.object({
  email: z.email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type PoliceLoginFormValues = z.infer<typeof policeLoginSchema>;

export default function PoliceLoginPage() {
  return (
    <Suspense>
      <PoliceLoginForm />
    </Suspense>
  );
}

function PoliceLoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/police";

  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [showResendVerification, setShowResendVerification] = useState(false);

  const form = useForm<PoliceLoginFormValues>({
    resolver: zodResolver(policeLoginSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const email = form.watch("email");

  const policeLoginMutation = usePoliceLogin({
    onSuccess: () => {
      // Use window.location.href instead of router.push to ensure the newly-set session cookie is used for rendering
      window.location.href = callbackUrl;
    },
    onError: (requestError: Error) => {
      if (
        isAxiosError(requestError) &&
        requestError.response?.status === 403 &&
        requestError.response.data?.detail === "EMAIL_NOT_VERIFIED"
      ) {
        setSubmissionError(
          "Your account hasn't been verified yet. Please check your email for a verification link."
        );
        setShowResendVerification(true);
        return;
      }

      setSubmissionError(
        getErrorMessage(requestError, {
          status: { 401: "Invalid email or password." },
        })
      );
    },
  });

  const handleValid = (data: PoliceLoginFormValues) => {
    policeLoginMutation.mutate(data);
  };

  return (
    <AuthCard title="Police Sign In">
      <CardContent className="px-10 pb-6">
        <Form {...form}>
          <form
            onSubmit={(e) => {
              setSubmissionError(null);
              setShowResendVerification(false);
              form.handleSubmit(handleValid)(e);
            }}
            className="space-y-5"
          >
            <TextField
              control={form.control}
              name="email"
              label="Email"
              type="email"
              placeholder={`officer@${clientEnv.NEXT_PUBLIC_CHPD_EMAIL_DOMAIN}`}
              autoComplete="email"
            />

            <PasswordField
              control={form.control}
              name="password"
              label="Password"
              autoComplete="current-password"
            />

            {submissionError && (
              <p className="text-sm text-destructive text-center">
                {submissionError}
              </p>
            )}

            {showResendVerification && email && (
              <ResendVerificationButton email={email} />
            )}

            <SubmitButton
              pending={policeLoginMutation.isPending}
              label="Sign In"
              pendingLabel="Signing in..."
              className="w-full"
            />
          </form>
        </Form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Need an account?{" "}
          <Link href="/police/signup" className="text-primary underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </AuthCard>
  );
}
