/**
 * NextAuth config options — exported so other server routes can use getServerSession(authOptions)
 * Split from the route handler to allow re-use in API routes.
 */

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

const providers: NextAuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { prompt: "select_account" } },
    })
  );
}

providers.push(
  CredentialsProvider({
    name: "Email",
    credentials: {
      username: { label: "Name",     type: "text"     },
      email:    { label: "Email",    type: "email"    },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      if (credentials.password.length < 4) return null;
      const displayName = credentials.username?.trim() || credentials.email.split("@")[0];
      return { id: credentials.email, name: displayName, email: credentials.email };
    },
  })
);

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) { token.id = user.id ?? user.email; token.name = user.name; token.email = user.email; }
      if (account?.provider === "google") token.provider = "google";
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.email = token.email as string;
        session.user.name  = token.name  as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-change-in-production-32chars",
  debug: process.env.NODE_ENV === "development",
};
