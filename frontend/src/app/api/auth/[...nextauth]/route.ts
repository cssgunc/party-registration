import NextAuth, { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { cookies } from "next/headers";

type AuthTokens = {
  accessToken?: string;
  refreshToken?: string;
};

const authOptions: NextAuthOptions = {
  providers: [
    // Once we receive details about how ONYEN SSO works, we can add the clientId, clientSecret, authorization, etc. here
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username;
        const password = credentials?.password;

        // Replace this with the actual authentication logic.
        if (username === "admin" && password === "password") {
          return {
            id: "1",
            name: "Admin User",
            email: "admin@example.com",
            accessToken: "fake-access-token-for-dev",
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
  events: {
    async signIn({ user }) {
      // Set refresh token as HTTP-only; access token is readable by client and server
      try {
        const cookieStore = await cookies();

        const { accessToken, refreshToken } = (user as User & AuthTokens) || {};

        if (accessToken) {
          cookieStore.set("access-token", accessToken, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60, // 1 hour
          });
        }

        if (refreshToken) {
          cookieStore.set("refresh-token", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 days
          });
        }
      } catch (error) {
        console.error("Error setting auth cookies:", error);
      }
    },
    async signOut() {
      // Clear auth cookies on sign out
      try {
        const cookieStore = await cookies();
        cookieStore.set("access-token", "", {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 0,
        });
        cookieStore.set("refresh-token", "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 0,
        });
      } catch (error) {
        console.error("Error clearing auth cookies on sign out:", error);
      }
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
