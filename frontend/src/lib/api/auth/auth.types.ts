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

const accessTokenPayloadSchema = z.object({
  sub: z.union([z.string(), z.number()]).transform(Number),
  role: z.union([accountRoleSchema, policeRoleSchema]),
  exp: z.union([z.string(), z.number()]).transform(Number),
  iat: z.union([z.string(), z.number()]).transform(Number),
});

type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;

type AccountCurrentPrincipal = AccountDto & {
  principal_type: "account";
};

type PoliceCurrentPrincipal = PoliceAccountDto & {
  principal_type: "police";
};

type CurrentPrincipal = AccountCurrentPrincipal | PoliceCurrentPrincipal;

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
  AccountCurrentPrincipal,
  CurrentPrincipal,
  ExchangeTokenRequest,
  PoliceCurrentPrincipal,
  PoliceLoginRequest,
  PoliceLoginResponse,
  PoliceSignupRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RetryPoliceVerificationRequest,
  TokenPair,
  VerifyPoliceEmailRequest,
};

export { accessTokenPayloadSchema };
