"use client";

import AuthCard from "@/app/police/(auth)/_components/AuthCard";
import { SubmitButton } from "@/components/form/SubmitButton";
import { PasswordField } from "@/components/form/fields";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useResetPolicePassword } from "@/lib/api/auth/auth.queries";
import { getErrorMessage } from "@/lib/errors";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

/**
 * Police reset-password page; wraps `PoliceResetPasswordContent` in a
 * `Suspense` boundary to allow reading the `token` search param.
 */
export default function PoliceResetPasswordPage() {
  return (
    <Suspense>
      <PoliceResetPasswordContent />
    </Suspense>
  );
}

/**
 * Form for setting a new password using a token from a reset-password email.
 *
 * Shows an error state immediately when the token is missing from the URL, and
 * a success state after the password is updated, with a link back to login.
 * Maps the 401 response to a human-readable "link expired" message.
 */
function PoliceResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isComplete, setIsComplete] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
    defaultValues: { password: "", confirm_password: "" },
  });

  const resetPasswordMutation = useResetPolicePassword({
    onSuccess: () => {
      setIsComplete(true);
    },
    onError: (error) => {
      setSubmissionError(
        getErrorMessage(error, {
          status: {
            401: "This reset link is invalid or has expired. Please request a new one.",
          },
        })
      );
    },
  });

  const handleValid = (data: ResetPasswordFormValues) => {
    resetPasswordMutation.mutate({ token: token!, ...data });
  };

  if (!token) {
    return (
      <AuthCard title="Invalid Link">
        <CardContent className="px-10 pb-8 pt-2 text-center space-y-4">
          <p className="text-sm text-destructive">
            This password reset link is invalid. Please request a new one.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/police/forgot-password">Request New Link</Link>
          </Button>
        </CardContent>
      </AuthCard>
    );
  }

  if (isComplete) {
    return (
      <AuthCard title="Password Reset">
        <CardContent className="px-10 pb-8 pt-2 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Your password has been reset successfully.
          </p>
          <Button asChild className="w-full">
            <Link href="/police/login">Sign In</Link>
          </Button>
        </CardContent>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset Password"
      description="Enter your new password below."
    >
      <CardContent className="px-10 py-6">
        <Form {...form}>
          <form
            onSubmit={(e) => {
              setSubmissionError(null);
              form.handleSubmit(handleValid)(e);
            }}
            className="space-y-5"
          >
            <PasswordField
              control={form.control}
              name="password"
              label="New Password"
              autoComplete="new-password"
            />

            <PasswordField
              control={form.control}
              name="confirm_password"
              label="Confirm New Password"
              autoComplete="new-password"
            />

            {submissionError && (
              <p className="text-sm text-destructive text-center">
                {submissionError}
              </p>
            )}

            <SubmitButton
              pending={resetPasswordMutation.isPending}
              label="Reset Password"
              pendingLabel="Resetting..."
              className="w-full"
            />
          </form>
        </Form>
      </CardContent>
    </AuthCard>
  );
}
