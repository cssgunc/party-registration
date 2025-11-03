import NextAuth, { NextAuthOptions } from "next-auth";
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
  callbacks: {
    async jwt({ token, user }) {
      // Store access token in JWT when user signs in
      if (user && user.accessToken) {
        token.accessToken = user.accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      // Attach access token to session object
      if (token.accessToken) {
        session.accessToken = token.accessToken;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST, authOptions };
