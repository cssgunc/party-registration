import {
  type AccountDto,
  type AccountRole,
  accountRoleSchema,
} from "@/lib/api/account/account.types";
import { z } from "zod";
import {
  type PoliceAccountDto,
  policeRoleSchema,
} from "../police/police.types";

/** Access/refresh token pair returned by auth endpoints. */
type TokenPair = {
  access_token: string;
  access_token_expires: string;
  refresh_token: string;
  refresh_token_expires: string;
};

/** Payload sent to `POST /auth/exchange` to exchange a SAML assertion for a token pair. */
type ExchangeTokenRequest = {
  email: string;
  first_name: string;
  last_name: string;
  pid: string;
  onyen: string;
  role: AccountRole;
};

/**
 * Zod schema for the decoded JWT access-token payload.
 *
 * Coerces `sub`, `exp`, and `iat` to numbers so the payload is uniform
 * regardless of whether the backend encoded them as strings or numbers.
 */
const accessTokenPayloadSchema = z.object({
  sub: z.union([z.string(), z.number()]).transform(Number),
  role: z.union([accountRoleSchema, policeRoleSchema]),
  exp: z.union([z.string(), z.number()]).transform(Number),
  iat: z.union([z.string(), z.number()]).transform(Number),
});

/** Decoded payload of the JWT access token, validated by `accessTokenPayloadSchema`. */
type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;

/** Current principal for a regular (SAML/IdP) account session. */
type AccountCurrentPrincipal = AccountDto & {
  principal_type: "account";
};

/** Current principal for a police account session. */
type PoliceCurrentPrincipal = PoliceAccountDto & {
  principal_type: "police";
};

/** Discriminated union of the two principal types returned by `GET /auth/me`. */
type CurrentPrincipal = AccountCurrentPrincipal | PoliceCurrentPrincipal;

/** Payload sent to `POST /auth/refresh` to obtain a new access token. */
type RefreshTokenRequest = {
  refresh_token: string;
};

/** New access token and its expiry returned by `POST /auth/refresh`. */
type RefreshTokenResponse = {
  access_token: string;
  access_token_expires: string;
};

/** Credentials sent to `POST /auth/police/login`. */
type PoliceLoginRequest = {
  email: string;
  password: string;
};

/** Full token pair returned on successful police login. */
type PoliceLoginResponse = TokenPair;

/** Fields required to register a new police account (`POST /auth/police/signup`). */
type PoliceSignupRequest = {
  email: string;
  password: string;
  confirm_password: string;
};

/** Payload to re-send the verification email for a police account. */
type RetryPoliceVerificationRequest = {
  email: string;
};

/** Token from the verification email link, sent to `POST /auth/police/verify`. */
type VerifyPoliceEmailRequest = {
  token: string;
};

/** Email address sent to `POST /auth/police/forgot-password` to trigger a reset email. */
type ForgotPolicePasswordRequest = {
  email: string;
};

/** New credentials sent to `POST /auth/police/reset-password` using the emailed token. */
type ResetPolicePasswordRequest = {
  token: string;
  password: string;
  confirm_password: string;
};

export type {
  AccessTokenPayload,
  AccountCurrentPrincipal,
  CurrentPrincipal,
  ExchangeTokenRequest,
  ForgotPolicePasswordRequest,
  PoliceCurrentPrincipal,
  PoliceLoginRequest,
  PoliceLoginResponse,
  PoliceSignupRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ResetPolicePasswordRequest,
  RetryPoliceVerificationRequest,
  TokenPair,
  VerifyPoliceEmailRequest,
};

export { accessTokenPayloadSchema };
