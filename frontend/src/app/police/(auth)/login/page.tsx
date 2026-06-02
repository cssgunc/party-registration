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
import { usePoliceLogin } from "@/lib/api/auth/auth.queries";
import { clientEnv } from "@/lib/config/env.client";
import { getErrorMessage } from "@/lib/errors";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
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

  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<PoliceLoginFormValues>({
    resolver: zodResolver(policeLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const email = form.watch("email");

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

  const handleValid = (data: PoliceLoginFormValues) => {
    policeLoginMutation.mutate(data);
  };

  return (
    <AuthCard title="Police Sign In">
      <CardContent className="px-10 pb-6">
        <Form {...form}>
          <form
            onSubmit={(e) => {
              setSubmissionError(null);
              setShowResendVerification(false);
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
                      placeholder={`officer@${clientEnv.NEXT_PUBLIC_CHPD_EMAIL_DOMAIN}`}
                      autoComplete="email"
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
                        autoComplete="current-password"
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

            {submissionError && (
              <p className="text-sm text-destructive text-center">
                {submissionError}
              </p>
            )}

            {showResendVerification && email && (
              <ResendVerificationButton email={email} />
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={policeLoginMutation.isPending}
            >
              {policeLoginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </Form>

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
