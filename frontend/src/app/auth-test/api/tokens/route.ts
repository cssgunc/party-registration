import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// Test route to verify that the access token is being pulled from the access token cookie and attached to the request
// when the custom API client is used.
export async function GET() {
  // Throw 401 if the access token is expired
  const session = await getServerSession(authOptions);
  if (session?.accessTokenExpires && Date.now() >= session.accessTokenExpires) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the access token from the Authorization header
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  return NextResponse.json(
    {
      success: true,
      accessToken: accessToken,
    },
    { status: 200 }
  );
}
