"use client";

import AuthCard from "@/app/police/(auth)/_components/AuthCard";
import ResendVerificationButton from "@/app/police/(auth)/_components/ResendVerificationButton";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePoliceLogin } from "@/lib/api/auth/auth.queries";
import { clientEnv } from "@/lib/config/env.client";
import { getErrorMessage } from "@/lib/errors";
import { isAxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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
  const [showPassword, setShowPassword] = useState(false);

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

  function handleSubmit(e: { preventDefault: () => void }) {
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
    <AuthCard title="Police Sign In">
      <CardContent className="px-10 pb-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder={`officer@${clientEnv.NEXT_PUBLIC_CHPD_EMAIL_DOMAIN}`}
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
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
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
