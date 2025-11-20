import axios from "axios";
import type { Session, User } from "next-auth";
import NextAuth, { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

const authOptions: NextAuthOptions = {
  providers: [
    // Once we receive details about how ONYEN SSO works, we can add the clientId, clientSecret, authorization, etc. here
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(
        credentials: Record<string, string> | undefined
      ): Promise<User | null> {
        const username = credentials?.username;
        const password = credentials?.password;

        // Replace this with the actual authentication logic once we know how ONYEN SSO works
        if (username === "admin" && password === "password") {
          return {
            id: "2",
            name: "Admin User",
            email: "admin@example.com",
            accessToken: "admin",
            refreshToken: "fake-refresh-token-for-dev",
          };
        }
        if (username === "student" && password === "password") {
          return {
            id: "1",
            name: "Student User",
            email: "student@example.com",
            accessToken: "student",
            refreshToken: "fake-refresh-token-for-dev",
          };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // On sign-in, persist tokens to the JWT. JWT is stored as HTTP-only cookie by default in NextAuth.
      if (user) {
        const u = user as { accessToken?: string; refreshToken?: string };
        if (u.accessToken) token.accessToken = u.accessToken;
        if (u.refreshToken) token.refreshToken = u.refreshToken;
        if (!token.accessTokenExpires)
          token.accessTokenExpires = Date.now() + 60 * 60 * 1000;
        return token;
      }

      // If token still valid, return as-is
      if (
        token.accessToken &&
        token.accessTokenExpires &&
        Date.now() < token.accessTokenExpires
      ) {
        return token;
      }

      // Refresh using refreshToken stored on JWT. Since we always pull latest session data in the API client, the jwt()
      // callback will be called again and refresh the token if needed before it is used by the API client.
      try {
        const base =
          process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
        const resp = await axios.post(
          `${base}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const data = resp.data || {};
        if (data.accessToken) token.accessToken = data.accessToken as string;
        if (data.refreshToken) token.refreshToken = data.refreshToken as string;
        token.accessTokenExpires = Date.now() + 60 * 60 * 1000;
        return token;
      } catch {
        // Invalidate tokens on failure
        delete token.accessToken;
        delete token.refreshToken;
        delete token.accessTokenExpires;
        return token;
      }
    },
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }): Promise<Session> {
      // Add access token to session
      if (token.accessToken) session.accessToken = token.accessToken;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { authOptions, handler as GET, handler as POST };
