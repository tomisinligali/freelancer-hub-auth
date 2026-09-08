import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days session per PRD & Security Rule 9
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password.");
        }

        if (user.deactivatedAt) {
          throw new Error("This account is currently deactivated.");
        }

        if (!user.emailVerified) {
          throw new Error("Please verify your email address before signing in.");
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          throw new Error("Invalid email or password.");
        }

        return {
          id: user.id,
          email: user.email,
        };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        if (!profile?.email) {
          return false;
        }

        // Security Rule 5: Google OAuth may only auto-link when email_verified is true
        const emailVerified = (profile as { email_verified?: boolean }).email_verified;
        if (!emailVerified) {
          return false;
        }

        const email = profile.email.toLowerCase();
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          if (existingUser.deactivatedAt) {
            return false;
          }
          if (!existingUser.emailVerified) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                emailVerified: new Date(),
                oauthProvider: "google",
                oauthId: account.providerAccountId,
              },
            });
          }
          user.id = existingUser.id;
        } else {
          const newUser = await prisma.user.create({
            data: {
              email,
              emailVerified: new Date(),
              oauthProvider: "google",
              oauthId: account.providerAccountId,
            },
          });
          user.id = newUser.id;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
