import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { cookies } from "next/headers";

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

        // Replace this with the actual authentication logic once we know how ONYEN SSO works
        if (username === "admin" && password === "password") {
          return {
            id: "1",
            name: "Admin User",
            email: "admin@example.com",
            accessToken: "fake-access-token-for-dev",
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
      // Set access token as a cookie (not HTTP-only so it can be read by client-side JS)
      try {
        const cookieStore = await cookies();
        const { accessToken } = (user as { accessToken?: string }) || {};

        if (accessToken) {
          cookieStore.set("access-token", accessToken, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60, // 1 hour
          });
        }
      } catch (error) {
        console.error("Error setting access token cookie:", error);
      }
    },
    async signOut() {
      // Clear access token cookie on sign out
      try {
        const cookieStore = await cookies();
        cookieStore.set("access-token", "", {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 0,
        });
      } catch (error) {
        console.error("Error clearing access token cookie:", error);
      }
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST, authOptions };
