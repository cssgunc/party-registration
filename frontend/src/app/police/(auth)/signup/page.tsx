"use client";

import AuthCard from "@/app/police/(auth)/_components/AuthCard";
import ResendVerificationButton from "@/app/police/(auth)/_components/ResendVerificationButton";
import { SubmitButton } from "@/components/form/SubmitButton";
import { PasswordField, TextField } from "@/components/form/fields";
import { CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { usePoliceSignup } from "@/lib/api/auth/auth.queries";
import { clientEnv } from "@/lib/config/env.client";
import { getErrorMessage } from "@/lib/errors";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const allowedDomain = clientEnv.NEXT_PUBLIC_CHPD_EMAIL_DOMAIN;

const policeSignupSchema = z
  .object({
    email: z
      .email("Please enter a valid email")
      .refine((val) => val.toLowerCase().endsWith(`@${allowedDomain}`), {
        message: `Email must use the @${allowedDomain} domain`,
      }),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type PoliceSignupFormValues = z.infer<typeof policeSignupSchema>;

export default function PoliceSignupPage() {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const form = useForm<PoliceSignupFormValues>({
    resolver: zodResolver(policeSignupSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
      confirm_password: "",
    },
  });
  const email = form.watch("email");

  const policeSignupMutation = usePoliceSignup({
    onSuccess: () => {
      setIsComplete(true);
    },
    onError: (requestError: Error) => {
      if (isAxiosError(requestError) && requestError.response?.status === 409) {
        setSubmissionError("An account with that email already exists.");
        return;
      }

      setSubmissionError(getErrorMessage(requestError));
    },
  });

  const handleValid = (data: PoliceSignupFormValues) => {
    policeSignupMutation.mutate({
      email: data.email,
      password: data.password,
      confirm_password: data.confirm_password,
    });
  };

  return (
    <AuthCard
      title="Police Sign Up"
      description={
        isComplete
          ? "Check your email to verify your account before logging in."
          : "Create your account, then verify your email before logging in."
      }
    >
      <CardContent className="px-10 py-6">
        {isComplete ? (
          <div className="space-y-4 text-center">
            <ResendVerificationButton email={email ?? ""} startInCooldown />
            <Link
              href="/police/login"
              className="text-sm text-primary underline"
            >
              Back to police login
            </Link>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={(e) => {
                setSubmissionError(null);
                form.handleSubmit(handleValid)(e);
              }}
              className="space-y-5"
            >
              <TextField
                control={form.control}
                name="email"
                label="Email"
                type="email"
                autoComplete="email"
                placeholder={`officer@${allowedDomain}`}
              />

              <PasswordField
                control={form.control}
                name="password"
                label="Password"
                autoComplete="new-password"
              />

              <PasswordField
                control={form.control}
                name="confirm_password"
                label="Confirm Password"
                autoComplete="new-password"
              />

              {submissionError && (
                <p className="text-center text-sm text-destructive">
                  {submissionError}
                </p>
              )}

              <SubmitButton
                pending={policeSignupMutation.isPending}
                label="Create Account"
                pendingLabel="Creating Account..."
                className="w-full"
              />

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/police/login" className="text-primary underline">
                  Sign in
                </Link>
              </p>
            </form>
          </Form>
        )}
      </CardContent>
    </AuthCard>
  );
}
