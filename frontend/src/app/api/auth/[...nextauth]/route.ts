import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

/**
 * ASTRAMIND NextAuth Configuration
 * - Custom credentials provider (email + password)
 * - User data stored per-email in localStorage (frontend) for history
 * - JWT session strategy — no DB required for auth itself
 * - NEXTAUTH_SECRET must be set in env (both locally and Vercel/Render)
 */
const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "ASTRAMIND",
      credentials: {
        username: { label: "Username", type: "text" },
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Validate minimal required fields
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        if (credentials.password.length < 4) {
          return null;
        }

        // In this MVP, any valid email + password (min 4 chars) authenticates.
        // For Neon-persisted users, swap this for a DB lookup.
        const displayName =
          credentials.username ||
          credentials.email.split("@")[0];

        return {
          id: credentials.email,          // Use email as stable user ID
          name: displayName,
          email: credentials.email,
        };
      },
    }),
  ],

  session: { strategy: "jwt" },

  // Custom pages — uses our premium branded sign-in page
  pages: {
    signIn: "/signin",
    error: "/signin",
  },

  callbacks: {
    // Embed full user info in the JWT token
    async jwt({ token, user }) {
      if (user) {
        token.id    = user.id;
        token.name  = user.name;
        token.email = user.email;
      }
      return token;
    },
    // Expose user info from token to session
    async session({ session, token }) {
      if (token && session.user) {
        session.user.email = token.email as string;
        session.user.name  = token.name  as string;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
