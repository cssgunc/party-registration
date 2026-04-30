import {
  type AccountRole,
  accountRoleSchema,
} from "@/lib/api/account/account.types";
import { z } from "zod";
import { policeRoleSchema } from "../police/police.types";

type TokenPair = {
  access_token: string;
  access_token_expires: string;
  refresh_token: string;
  refresh_token_expires: string;
};

type ExchangeTokenRequest = {
  email: string;
  first_name: string;
  last_name: string;
  pid: string;
  onyen: string;
  role: AccountRole;
};

const accountAccessTokenPayloadSchema = z.object({
  sub: z.union([z.string(), z.number()]).transform(Number),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  pid: z.string(),
  onyen: z.string(),
  role: accountRoleSchema,
  exp: z.union([z.string(), z.number()]).transform(Number),
  iat: z.union([z.string(), z.number()]).transform(Number),
});

const policeAccessTokenPayloadSchema = z.object({
  sub: z.union([z.string(), z.number()]).transform(Number),
  email: z.string(),
  role: policeRoleSchema,
  exp: z.union([z.string(), z.number()]).transform(Number),
  iat: z.union([z.string(), z.number()]).transform(Number),
});

const accessTokenPayloadSchema = z.union([
  accountAccessTokenPayloadSchema,
  policeAccessTokenPayloadSchema,
]);

type AccountAccessTokenPayload = z.infer<
  typeof accountAccessTokenPayloadSchema
>;
type PoliceAccessTokenPayload = z.infer<typeof policeAccessTokenPayloadSchema>;
type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;

type RefreshTokenRequest = {
  refresh_token: string;
};

type RefreshTokenResponse = {
  access_token: string;
  access_token_expires: string;
};

type PoliceLoginRequest = {
  email: string;
  password: string;
};

type PoliceLoginResponse = TokenPair;

type PoliceSignupRequest = {
  email: string;
  password: string;
  confirm_password: string;
};

type RetryPoliceVerificationRequest = {
  email: string;
};

type VerifyPoliceEmailRequest = {
  token: string;
};

export type {
  AccessTokenPayload,
  AccountAccessTokenPayload,
  ExchangeTokenRequest,
  PoliceAccessTokenPayload,
  PoliceLoginRequest,
  PoliceLoginResponse,
  PoliceSignupRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RetryPoliceVerificationRequest,
  TokenPair,
  VerifyPoliceEmailRequest,
};

export {
  accessTokenPayloadSchema,
  accountAccessTokenPayloadSchema,
  policeAccessTokenPayloadSchema,
};
