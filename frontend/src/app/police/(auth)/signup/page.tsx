"use client";

import AuthCard from "@/app/police/(auth)/_components/AuthCard";
import ResendVerificationButton from "@/app/police/(auth)/_components/ResendVerificationButton";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { usePoliceSignup } from "@/lib/api/auth/auth.queries";
import { clientEnv } from "@/lib/config/env.client";
import { getErrorMessage } from "@/lib/errors";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<PoliceSignupFormValues>({
    resolver: zodResolver(policeSignupSchema),
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
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        autoComplete="email"
                        placeholder={`officer@${allowedDomain}`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          className="pr-10"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          className="pr-10"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={
                          showConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
          </Form>
        )}
      </CardContent>
    </AuthCard>
  );
}
