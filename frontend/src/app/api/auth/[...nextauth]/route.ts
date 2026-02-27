import { identityProvider, serviceProvider } from "@/lib/saml";
import axios from "axios";
import NextAuth, {
  type NextAuthOptions,
  type Session,
  type User,
} from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

// Helper function to parse the incoming SAML assertion and return the user object via a promise
function postAssert(samlBody: Record<string, unknown>): Promise<{
  user: { name_id: string; email?: string; [key: string]: unknown };
}> {
  return new Promise((resolve, reject) => {
    serviceProvider.post_assert(
      identityProvider,
      { request_body: samlBody },
      (
        error: Error | null,
        response: { user: { name_id: string; email?: string } }
      ) => {
        if (error) reject(error);
        else resolve(response);
      }
    );
  });
}

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "saml",
      name: "SAML",
      credentials: {
        samlBody: { type: "hidden" },
      },
      async authorize(credentials) {
        if (!credentials?.samlBody) return null;

        const samlBody = JSON.parse(decodeURIComponent(credentials.samlBody));

        try {
          const { user } = await postAssert(samlBody);
          return {
            id: user.name_id,
            name: user.name_id,
            email: user.email ?? null,
          };
        } catch (error) {
          console.error("SAML assertion failed:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, persist tokens to the JWT. JWT is stored as HTTP-only cookie by default in NextAuth
      if (user) {
        const u = user as User & {
          accessToken?: string;
          refreshToken?: string;
        };

        token.id = u.id;
        token.name = u.name;
        token.email = u.email;

        if (u.accessToken) token.accessToken = u.accessToken;
        if (u.refreshToken) token.refreshToken = u.refreshToken;

        if ((u.accessToken || u.refreshToken) && !token.accessTokenExpires) {
          token.accessTokenExpires = Date.now() + 60 * 60 * 1000;
        }

        return token;
      }

      // If we never had any tokens, there's nothing to refresh (SAML-only login still works)
      if (!token.accessToken && !token.refreshToken) {
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
          process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";
        const resp = await axios.post(
          `${base}/auth/refresh`,
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
      if (session.user) {
        session.user.name = token.name ?? null;
        session.user.email = token.email ?? null;
      }

      // Add access token to session so that the Axios API client can automatically attach it to the request headers
      if (token.accessToken) {
        (session as Session & { accessToken?: string }).accessToken =
          token.accessToken as string;
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { authOptions, handler as GET, handler as POST };
