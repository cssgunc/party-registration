"use client";

import AuthCard from "@/app/police/(auth)/_components/AuthCard";
import { SubmitButton } from "@/components/form/SubmitButton";
import { TextField } from "@/components/form/fields";
import { CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useForgotPolicePassword } from "@/lib/api/auth/auth.queries";
import { clientEnv } from "@/lib/config/env.client";
import { getErrorMessage } from "@/lib/errors";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const forgotPasswordSchema = z.object({
  email: z.email("Please enter a valid email"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function PoliceForgotPasswordPage() {
  const [isComplete, setIsComplete] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
    defaultValues: { email: "" },
  });

  const forgotPasswordMutation = useForgotPolicePassword({
    onSuccess: () => {
      setIsComplete(true);
    },
    onError: (error) => {
      setSubmissionError(getErrorMessage(error));
    },
  });

  const handleValid = (data: ForgotPasswordFormValues) => {
    forgotPasswordMutation.mutate(data);
  };

  if (isComplete) {
    return (
      <AuthCard title="Check Your Email">
        <CardContent className="px-10 pb-8 pt-2 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            If an account with that email exists, you&apos;ll receive a password
            reset link shortly. The link will expire in{" "}
            {clientEnv.NEXT_PUBLIC_PASSWORD_RESET_TOKEN_EXPIRE_HOURS === 1
              ? "1 hour"
              : `${clientEnv.NEXT_PUBLIC_PASSWORD_RESET_TOKEN_EXPIRE_HOURS} hours`}
            .
          </p>
          <Link
            href="/police/login"
            className="text-sm text-primary underline block"
          >
            Back to Sign In
          </Link>
        </CardContent>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot Password"
      description="Enter your email and we'll send you a link to reset your password."
    >
      <CardContent className="px-10 pb-6">
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
              placeholder="officer@chapelhillnc.gov"
              autoComplete="email"
            />

            {submissionError && (
              <p className="text-sm text-destructive text-center">
                {submissionError}
              </p>
            )}

            <SubmitButton
              pending={forgotPasswordMutation.isPending}
              label="Send Reset Link"
              pendingLabel="Sending..."
              className="w-full"
            />
          </form>
        </Form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/police/login" className="text-primary underline">
            Back to Sign In
          </Link>
        </p>
      </CardContent>
    </AuthCard>
  );
}
