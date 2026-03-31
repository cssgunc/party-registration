import { policeLogin, setAuthCookies } from "@/lib/api/auth/auth.service";
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

    const res = NextResponse.json({ ok: true });

    await setAuthCookies(res, data, {
      sub: "police",
      id: "police",
      email,
      name: email,
      role: "police",
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
}
