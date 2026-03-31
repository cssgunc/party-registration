import type { AccountRole } from "@/lib/api/account/account.types";

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

type ExchangeTokenResponse = TokenPair;

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

export type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  PoliceLoginRequest,
  PoliceLoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  TokenPair,
};
