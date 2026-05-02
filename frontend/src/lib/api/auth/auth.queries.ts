import {
  getCurrentPrincipal,
  policeLoginViaRoute,
  retryPoliceVerification,
  signupPolice,
  verifyPoliceEmail,
} from "@/lib/api/auth/auth.service";
import {
  CurrentPrincipal,
  PoliceLoginRequest,
  PoliceSignupRequest,
  RetryPoliceVerificationRequest,
  VerifyPoliceEmailRequest,
} from "@/lib/api/auth/auth.types";
import { useMutation, useQuery } from "@tanstack/react-query";

export const CURRENT_PRINCIPAL_KEY = ["auth", "me"] as const;

export function useCurrentPrincipal(options?: { enabled?: boolean }) {
  return useQuery<CurrentPrincipal, Error>({
    queryKey: CURRENT_PRINCIPAL_KEY,
    queryFn: getCurrentPrincipal,
    ...options,
  });
}

export function usePoliceLogin(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  return useMutation<void, Error, PoliceLoginRequest>({
    mutationFn: policeLoginViaRoute,
    ...options,
  });
}

export function usePoliceSignup(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  return useMutation<void, Error, PoliceSignupRequest>({
    mutationFn: signupPolice,
    ...options,
  });
}

export function useRetryPoliceVerification(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  return useMutation<void, Error, RetryPoliceVerificationRequest>({
    mutationFn: retryPoliceVerification,
    ...options,
  });
}

export function useVerifyPoliceEmail(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  return useMutation<void, Error, VerifyPoliceEmailRequest>({
    mutationFn: verifyPoliceEmail,
    ...options,
  });
}
