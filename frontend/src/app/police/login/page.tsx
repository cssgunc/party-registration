"use client";

import ResendVerificationButton from "@/app/police/_components/ResendVerificationButton";
import partySamrtVertical from "@/components/icons/party_smart_logo_vertical.svg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePoliceLogin } from "@/lib/api/auth/auth.queries";
import { isAxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
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
  const [showPassword, setShowPassword] = useState(false);

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
    <main className="flex h-full items-center justify-center px-4 py-6">
      <Card className="w-full max-w-md">
        <CardHeader className="px-6 pt-6 text-center">
          <div className="flex justify-center mb-3">
            <Image
              src={partySamrtVertical}
              alt="Party Smart by OCSL"
              loading="eager"
              className="h-60 w-auto"
            />
          </div>
          <CardTitle id="police-login-title" className="text-2xl mb-2">
            Police Sign In
          </CardTitle>
        </CardHeader>
        <CardContent className="px-10 pb-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="officer@chapelhillnc.gov"
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
      </Card>
    </main>
  );
}
