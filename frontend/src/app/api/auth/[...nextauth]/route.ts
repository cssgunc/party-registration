import { identityProvider, serviceProvider } from "@/lib/saml";
import NextAuth, { NextAuthOptions } from "next-auth";
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
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name ?? null;
        session.user.email = token.email ?? null;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { authOptions, handler as GET, handler as POST };
