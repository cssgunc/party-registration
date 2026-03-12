import { identityProvider, serviceProvider } from "@/lib/saml";
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
        role: { type: "hidden" },
      },
      async authorize(credentials) {
        if (!credentials?.samlBody) return null;

        const samlBody = JSON.parse(decodeURIComponent(credentials.samlBody));

        const role = (credentials.role as User["role"]) ?? undefined;

        try {
          const { user } = await postAssert(samlBody);
          const attrs = (user.attributes ?? {}) as Record<string, string[]>;
          return {
            id: user.name_id,
            name: `${attrs.givenName?.[0]} ${attrs.sn?.[0]}`,
            email: attrs.mail?.[0] ?? null,
            firstName: attrs.givenName?.[0],
            lastName: attrs.sn?.[0],
            onyen: attrs.uid?.[0],
            pid: attrs.pid?.[0],
            role,
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
      // On initial sign-in, persist identity and access token to the JWT.
      // NOTE: The refresh token is never stored here — it lives in its own
      // path-restricted httpOnly cookie managed by /api/auth/token/refresh.
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.onyen = user.onyen;
        token.pid = user.pid;
        token.role = user.role;

        if (user.accessToken) token.accessToken = user.accessToken;
        if (user.accessTokenExpires)
          token.accessTokenExpires = user.accessTokenExpires;
        if (user.refreshTokenExpires)
          token.refreshTokenExpires = user.refreshTokenExpires;

        return token;
      }

      // If the refresh token window has closed, invalidate the session immediately
      // so the client is forced to re-authenticate rather than trying to refresh.
      if (
        token.refreshTokenExpires &&
        Date.now() >= token.refreshTokenExpires
      ) {
        delete token.accessToken;
        delete token.accessTokenExpires;
        delete token.refreshTokenExpires;
        return token;
      }

      return token;
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

      session.id = token.id;
      session.firstName = token.firstName;
      session.lastName = token.lastName;
      session.onyen = token.onyen;
      session.pid = token.pid;
      session.role = token.role;

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
