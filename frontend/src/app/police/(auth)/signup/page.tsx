"use client";

import AuthCard from "@/app/police/(auth)/_components/AuthCard";
import ResendVerificationButton from "@/app/police/(auth)/_components/ResendVerificationButton";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePoliceSignup } from "@/lib/api/auth/auth.queries";
import { clientEnv } from "@/lib/config/env.client";
import { getErrorMessage } from "@/lib/errors";
import { isAxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
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
            <ResendVerificationButton
              email={formData.email ?? ""}
              startInCooldown
            />
            <Link
              href="/police/login"
              className="text-sm text-primary underline"
            >
              Back to police login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={`officer@${allowedDomain}`}
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  aria-invalid={!!errors.password}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.confirm_password}
                  onChange={(e) =>
                    updateField("confirm_password", e.target.value)
                  }
                  aria-invalid={!!errors.confirm_password}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
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
              <Link href="/police/login" className="text-primary underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </AuthCard>
  );
}
