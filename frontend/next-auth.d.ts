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
    role?: "admin" | "staff" | "student" | "police";
    firstName?: string;
    lastName?: string;
    onyen?: string;
    pid?: string;
  }
}

declare module "next-auth/jwt" {
  // JWT is stored as HTTP-only cookie by default in NextAuth.
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number; // ms epoch
    id?: string;
    role?: "admin" | "staff" | "student" | "police";
    firstName?: string;
    lastName?: string;
    onyen?: string;
    pid?: string;
  }
}
