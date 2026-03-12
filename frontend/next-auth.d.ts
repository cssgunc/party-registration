import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    id?: string;
    role?: "admin" | "staff" | "student" | "police";
    firstName?: string;
    lastName?: string;
    onyen?: string;
    pid?: string;
  }

  interface User {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number; // ms epoch, sourced from backend token expiry
    refreshTokenExpires?: number; // ms epoch, sourced from backend token expiry
    role?: "admin" | "staff" | "student" | "police";
    firstName?: string;
    lastName?: string;
    onyen?: string;
    pid?: string;
  }
}

declare module "next-auth/jwt" {
  // JWT is stored as HTTP-only cookie by default in NextAuth.
  // NOTE: The refresh token is intentionally NOT stored here. It lives in a
  // dedicated httpOnly cookie scoped to path=/api/auth/token/refresh so the
  // browser cannot send it to any other endpoint.
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number; // ms epoch
    refreshTokenExpires?: number; // ms epoch — stored for early session invalidation, not the token itself
    id?: string;
    role?: "admin" | "staff" | "student" | "police";
    firstName?: string;
    lastName?: string;
    onyen?: string;
    pid?: string;
  }
}
