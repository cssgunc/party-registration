import {
  policeLoginViaRoute,
  retryPoliceVerification,
  signupPolice,
  verifyPoliceEmail,
} from "@/lib/api/auth/auth.service";
import type {
  PoliceLoginRequest,
  PoliceSignupRequest,
  RetryPoliceVerificationRequest,
  VerifyPoliceEmailRequest,
} from "@/lib/api/auth/auth.types";
import { OptimisticMutationOptions } from "@/lib/shared";
import { useMutation } from "@tanstack/react-query";

export function usePoliceLogin(
  options?: OptimisticMutationOptions<void, Error, PoliceLoginRequest>
) {
  return useMutation({
    ...options,
    mutationFn: (data: PoliceLoginRequest) => policeLoginViaRoute(data),
  });
}

export function usePoliceSignup(
  options?: OptimisticMutationOptions<void, Error, PoliceSignupRequest>
) {
  return useMutation({
    ...options,
    mutationFn: (data: PoliceSignupRequest) => signupPolice(data),
  });
}

export function useRetryPoliceVerification(
  options?: OptimisticMutationOptions<
    void,
    Error,
    RetryPoliceVerificationRequest
  >
) {
  return useMutation({
    ...options,
    mutationFn: (data: RetryPoliceVerificationRequest) =>
      retryPoliceVerification(data),
  });
}

export function useVerifyPoliceEmail(
  options?: OptimisticMutationOptions<void, Error, VerifyPoliceEmailRequest>
) {
  return useMutation({
    ...options,
    mutationFn: (data: VerifyPoliceEmailRequest) => verifyPoliceEmail(data),
  });
}
