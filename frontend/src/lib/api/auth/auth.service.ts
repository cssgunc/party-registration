import axios from "axios";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  PoliceLoginRequest,
  PoliceLoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from "./auth.types";

const base =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

function internalHeaders() {
  return { "X-Internal-Secret": process.env.INTERNAL_API_SECRET };
}

export async function exchangeToken(
  data: ExchangeTokenRequest
): Promise<ExchangeTokenResponse> {
  const resp = await axios.post(`${base}/auth/exchange`, data, {
    headers: internalHeaders(),
  });
  return resp.data as ExchangeTokenResponse;
}

export async function refreshToken(
  data: RefreshTokenRequest
): Promise<RefreshTokenResponse> {
  const resp = await axios.post(`${base}/auth/refresh`, data, {
    headers: internalHeaders(),
  });
  return resp.data as RefreshTokenResponse;
}

export async function policeLogin(
  data: PoliceLoginRequest
): Promise<PoliceLoginResponse> {
  const resp = await axios.post(`${base}/auth/police/login`, data, {
    headers: internalHeaders(),
  });
  return resp.data as PoliceLoginResponse;
}
