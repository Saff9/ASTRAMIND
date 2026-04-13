import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

/**
 * ASTRAMIND NextAuth Configuration
 *
 * Providers:
 *  1. Google OAuth  — requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in Vercel env
 *  2. Credentials   — email + password (min 4 chars). No DB needed — JWT only.
 *
 * Required env vars on Vercel:
 *   NEXTAUTH_SECRET      — openssl rand -base64 32
 *   NEXTAUTH_URL         — https://your-app.vercel.app
 *   GOOGLE_CLIENT_ID     — from Google Cloud Console
 *   GOOGLE_CLIENT_SECRET — from Google Cloud Console
 */

const providers = [];

// Google provider — only enabled if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    })
  );
}

// Credentials provider — always available
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

      const displayName =
        credentials.username?.trim() ||
        credentials.email.split("@")[0];

      return {
        id:    credentials.email,
        name:  displayName,
        email: credentials.email,
      };
    },
  })
);

const handler = NextAuth({
  providers,

  session: { strategy: "jwt" },

  // Custom branded sign-in page
  pages: {
    signIn: "/signin",
    error:  "/signin",
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id    = user.id ?? user.email;
        token.name  = user.name;
        token.email = user.email;
      }
      // For Google OAuth, set provider info
      if (account?.provider === "google") {
        token.provider = "google";
      }
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

  // Ensure secret is always set — fallback prevents crash in dev without env
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-change-in-production-32chars",
  
  debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST };
