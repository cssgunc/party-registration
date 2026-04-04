import NextAuth, { type NextAuthOptions, type Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

// No providers are registered here. Authentication is handled by dedicated
// server routes that encode the session JWT directly:
//   - SAML (student/staff/admin): /api/auth/login/saml
//   - Police (credentials):       /api/auth/police/login
// NextAuth is kept for its JWT decoding, session callbacks, and useSession() support.
const authOptions: NextAuthOptions = {
  providers: [],
  session: {
    strategy: "jwt",
  },
  callbacks: {
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

      // Expose the access token so the Axios API client can attach it to request headers
      if (token.accessToken) {
        session.accessToken = token.accessToken as string;
      }
      if (token.accessTokenExpires) {
        session.accessTokenExpires = token.accessTokenExpires as number;
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { authOptions, handler as GET, handler as POST };
