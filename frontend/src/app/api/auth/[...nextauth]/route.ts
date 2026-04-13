import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Guest Protocol",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "guest" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (credentials?.username) {
          // Provide free guest access to demo local storage functionality
          return { id: "1", name: credentials.username, email: `${credentials.username}@astramind.local` };
        }
        return null;
      }
    })
  ],
  session: { strategy: "jwt" }
});

export { handler as GET, handler as POST };
