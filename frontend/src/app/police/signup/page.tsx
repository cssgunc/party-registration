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
import { isAxiosError } from "axios";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function PoliceSignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const policeSignupMutation = usePoliceSignup({
    onSuccess: () => {
      setIsComplete(true);
    },
    onError: (requestError: Error) => {
      if (isAxiosError(requestError)) {
        if (requestError.response?.status === 409) {
          setError("An account with that email already exists.");
          return;
        }

        if (typeof requestError.response?.data?.detail === "string") {
          setError(requestError.response.data.detail);
          return;
        }
      }

      setError("Something went wrong. Please try again.");
    },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    policeSignupMutation.mutate({
      email,
      password,
      confirm_password: confirmPassword,
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
                  email={email}
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
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </div>

                {error && (
                  <p className="text-center text-sm text-destructive">
                    {error}
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
