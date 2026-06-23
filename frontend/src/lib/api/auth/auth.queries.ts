import {
  forgotPolicePassword,
  getCurrentPrincipal,
  policeLoginViaRoute,
  resetPolicePassword,
  retryPoliceVerification,
  signupPolice,
  verifyPoliceEmail,
} from "@/lib/api/auth/auth.service";
import {
  CurrentPrincipal,
  ForgotPolicePasswordRequest,
  PoliceLoginRequest,
  PoliceSignupRequest,
  ResetPolicePasswordRequest,
  RetryPoliceVerificationRequest,
  VerifyPoliceEmailRequest,
} from "@/lib/api/auth/auth.types";
import { useMutation, useQuery } from "@tanstack/react-query";

/** Query key for the current authenticated principal (`GET /auth/me`). */
export const CURRENT_PRINCIPAL_KEY = ["auth", "me"] as const;

/** Query for the currently authenticated principal; can be disabled until a session is confirmed. */
export function useCurrentPrincipal(options?: { enabled?: boolean }) {
  return useQuery<CurrentPrincipal, Error>({
    queryKey: CURRENT_PRINCIPAL_KEY,
    queryFn: getCurrentPrincipal,
    ...options,
  });
}

/** Mutation to submit police login credentials via the Next.js API route. */
export function usePoliceLogin(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  return useMutation<void, Error, PoliceLoginRequest>({
    mutationFn: policeLoginViaRoute,
    ...options,
  });
}

/** Mutation to register a new police account and trigger the verification email. */
export function usePoliceSignup(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  return useMutation<void, Error, PoliceSignupRequest>({
    mutationFn: signupPolice,
    ...options,
  });
}

/** Mutation to re-send the email verification link to a police account. */
export function useRetryPoliceVerification(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  return useMutation<void, Error, RetryPoliceVerificationRequest>({
    mutationFn: retryPoliceVerification,
    ...options,
  });
}

/** Mutation to verify a police account email using the token from the verification link. */
export function useVerifyPoliceEmail(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  return useMutation<void, Error, VerifyPoliceEmailRequest>({
    mutationFn: verifyPoliceEmail,
    ...options,
  });
}

/** Mutation to request a password-reset email for a police account. */
export function useForgotPolicePassword(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  return useMutation<void, Error, ForgotPolicePasswordRequest>({
    mutationFn: forgotPolicePassword,
    ...options,
  });
}

/** Mutation to set a new password for a police account using the emailed reset token. */
export function useResetPolicePassword(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  return useMutation<void, Error, ResetPolicePasswordRequest>({
    mutationFn: resetPolicePassword,
    ...options,
  });
}
