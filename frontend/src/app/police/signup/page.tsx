"use client";

import ResendVerificationButton from "@/app/police/_components/ResendVerificationButton";
import PartySmartLogo from "@/components/PartySmartLogo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePoliceSignup } from "@/lib/api/auth/auth.queries";
import { clientEnv } from "@/lib/config/env.client";
import { isAxiosError } from "axios";
import Link from "next/link";
import { FormEvent, useState } from "react";
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
  const [formData, setFormData] = useState<Partial<PoliceSignupFormValues>>({
    email: "",
    password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const policeSignupMutation = usePoliceSignup({
    onSuccess: () => {
      setIsComplete(true);
    },
    onError: (requestError: Error) => {
      if (isAxiosError(requestError)) {
        if (requestError.response?.status === 409) {
          setSubmissionError("An account with that email already exists.");
          return;
        }

        if (typeof requestError.response?.data?.detail === "string") {
          setSubmissionError(requestError.response.data.detail);
          return;
        }
      }

      setSubmissionError("Something went wrong. Please try again.");
    },
  });

  const updateField = <K extends keyof PoliceSignupFormValues>(
    field: K,
    value: PoliceSignupFormValues[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionError(null);

    const result = policeSignupSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    policeSignupMutation.mutate({
      email: result.data.email,
      password: result.data.password,
      confirm_password: result.data.confirm_password,
    });
  }

  return (
    <main className="flex h-full items-center justify-center px-4 py-6">
      <section
        className="w-full max-w-md"
        aria-labelledby="police-signup-title"
      >
        <Card className="max-w-none">
          <CardHeader className="px-6 pt-6 text-center">
            <div className="mb-4 flex justify-center rounded-lg bg-primary px-6 py-3">
              <PartySmartLogo />
            </div>
            <CardTitle id="police-signup-title" className="text-2xl">
              Police Sign Up
            </CardTitle>
            <CardDescription>
              Create your account, then verify your email before logging in.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {isComplete ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-foreground">
                  Check your email to verify your account before logging in.
                </p>
                <ResendVerificationButton
                  email={formData.email ?? ""}
                  initialCooldownSeconds={60}
                />
                <Link
                  href="/login/police"
                  className="text-sm text-primary underline"
                >
                  Back to police login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="officer@department.gov"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    aria-invalid={!!errors.password}
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={formData.confirm_password}
                    onChange={(e) =>
                      updateField("confirm_password", e.target.value)
                    }
                    aria-invalid={!!errors.confirm_password}
                  />
                  {errors.confirm_password && (
                    <p className="text-sm text-destructive">
                      {errors.confirm_password}
                    </p>
                  )}
                </div>

                {submissionError && (
                  <p className="text-center text-sm text-destructive">
                    {submissionError}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={policeSignupMutation.isPending}
                >
                  {policeSignupMutation.isPending
                    ? "Creating Account..."
                    : "Create Account"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login/police" className="text-primary underline">
                    Sign in
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
