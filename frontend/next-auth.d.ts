import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    role?: "admin" | "staff";
  }

  interface User {
    accessToken?: string;
    refreshToken?: string;
    role?: "admin" | "staff";
  }
}

declare module "next-auth/jwt" {
  // JWT is stored as HTTP-only cookie by default in NextAuth.
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number; // ms epoch
    role?: "admin" | "staff";
  }
}
