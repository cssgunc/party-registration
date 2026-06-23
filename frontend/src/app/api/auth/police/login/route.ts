import {
  decodeAccessTokenPayload,
  policeLogin,
  setAuthCookies,
} from "@/lib/api/auth/auth.service";
import { PoliceRole } from "@/lib/api/police/police.types";
import { isAxiosError } from "axios";
import { NextRequest, NextResponse } from "next/server";

/**
 * Credentials-based login endpoint for police accounts (`POST /api/auth/police/login`).
 *
 * Validates the request body, delegates to `policeLogin`, then encodes a
 * NextAuth session JWT and sets the auth cookies on success. Returns 403 with
 * the backend's `detail` message when the account is forbidden (e.g. unverified),
 * or 401 for any other authentication failure.
 */
export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  try {
    const data = await policeLogin({ email, password });

    const payload = decodeAccessTokenPayload(data.access_token);
    const payloadRole = payload.role;
    const policeId = String(payload.sub);

    const res = NextResponse.json({ ok: true });

    await setAuthCookies(res, data, {
      sub: policeId,
      id: policeId,
      role: payloadRole as PoliceRole,
    });

    return res;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      const detail =
        typeof error.response.data?.detail === "string"
          ? error.response.data.detail
          : typeof error.response.data?.message === "string"
            ? error.response.data.message
            : "Forbidden";

      return NextResponse.json({ detail }, { status: 403 });
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
