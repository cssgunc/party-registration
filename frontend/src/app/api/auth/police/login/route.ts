import {
  decodeJwtPayload,
  policeLogin,
  setAuthCookies,
} from "@/lib/api/auth/auth.service";
import { PoliceRole } from "@/lib/api/police/police.types";
import { isAxiosError } from "axios";
import { NextRequest, NextResponse } from "next/server";

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

    const payload = decodeJwtPayload(data.access_token);
    const payloadRole = payload.role;
    if (payloadRole !== "officer" && payloadRole !== "police_admin") {
      return NextResponse.json(
        { error: "Invalid token role" },
        { status: 401 }
      );
    }
    const policeId = String(payload.sub);

    const res = NextResponse.json({ ok: true });

    await setAuthCookies(res, data, {
      sub: policeId,
      id: policeId,
      email: payload.email,
      name: payload.email,
      role: payloadRole as PoliceRole,
    });

    return res;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      const detail =
        typeof error.response.data?.message === "string"
          ? error.response.data.message
          : "Forbidden";

      return NextResponse.json({ detail }, { status: 403 });
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
