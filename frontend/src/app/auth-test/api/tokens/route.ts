import { headers } from "next/headers";
import { NextResponse } from "next/server";

// Test route to verify that the access token is being pulled from the access token cookie and attached to the request
// when the custom API client is used.
export async function GET() {
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
