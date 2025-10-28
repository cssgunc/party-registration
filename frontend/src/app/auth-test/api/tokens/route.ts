import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const headersList = await headers();

    // Get the refresh token from the cookies since it is HTTP Only
    const refreshTokenCookie = cookieStore.get("refresh-token");

    // Get the access token from the Authorization header
    const authHeader = headersList.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    return NextResponse.json(
      {
        success: true,
        accessToken: bearerToken,
        refreshToken: refreshTokenCookie?.value,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error reading tokens from request:", error);

    return NextResponse.json(
      {
        error: "Failed to read authentication tokens",
        message: error instanceof Error ? error.message : "Unknown error",
        details: "Check server logs for more information",
      },
      { status: 500 }
    );
  }
}
