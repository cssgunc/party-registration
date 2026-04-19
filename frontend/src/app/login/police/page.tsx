"use client";

import ResendVerificationButton from "@/app/police/_components/ResendVerificationButton";
import PartySmartLogo from "@/components/PartySmartLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePoliceLogin } from "@/lib/api/auth/auth.queries";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
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

  const [formData, setFormData] = useState<Partial<PoliceLoginFormValues>>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [showResendVerification, setShowResendVerification] = useState(false);

  const policeLoginMutation = usePoliceLogin({
    onSuccess: () => {
      // Use window.location.href instead of router.push to ensure the newly-set session cookie is used for rendering
      window.location.href = callbackUrl;
    },
    onError: (requestError: Error) => {
      if (isAxiosError(requestError)) {
        if (
          requestError.response?.status === 403 &&
          requestError.response.data?.detail === "EMAIL_NOT_VERIFIED"
        ) {
          setSubmissionError(
            "Your account hasn't been verified yet. Please check your email for a verification link."
          );
          setShowResendVerification(true);
          return;
        }

        if (typeof requestError.response?.data?.error === "string") {
          setSubmissionError(requestError.response.data.error);
          return;
        }
      }

      setSubmissionError("Something went wrong. Please try again.");
    },
  });

  const updateField = <K extends keyof PoliceLoginFormValues>(
    field: K,
    value: PoliceLoginFormValues[K]
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmissionError(null);
    setShowResendVerification(false);

    const result = policeLoginSchema.safeParse(formData);
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

    policeLoginMutation.mutate(result.data);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6 bg-primary rounded-lg px-6 py-3">
            <PartySmartLogo />
          </div>
          <h1 className="text-2xl font-semibold">Police Sign In</h1>
          <p className="text-muted-foreground">
            Enter your department credentials
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="officer@department.gov"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              autoComplete="email"
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
              value={formData.password}
              onChange={(e) => updateField("password", e.target.value)}
              autoComplete="current-password"
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          {submissionError && (
            <p className="text-sm text-destructive text-center">
              {submissionError}
            </p>
          )}

          {showResendVerification && formData.email && (
            <ResendVerificationButton email={formData.email} />
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={policeLoginMutation.isPending}
          >
            {policeLoginMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Need an account?{" "}
          <Link href="/police/signup" className="text-primary underline">
            Sign up
          </Link>
        </p>

        <p className="text-center text-sm text-muted-foreground">
          Not a police officer?{" "}
          <Link href="/login" className="text-primary underline">
            Sign in with a different role
          </Link>
        </p>
      </div>
    </div>
  );
}
