import { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { compare } from 'bcryptjs';
import { eq } from 'drizzle-orm';

// Lazy import database to avoid errors when DATABASE_URL is not set
const getDb = async () => {
  if (!process.env.DATABASE_URL) return null;
  const { db } = await import('../db');
  return db;
};

const getUsers = async () => {
  if (!process.env.DATABASE_URL) return null;
  const { users } = await import('@booktarr/database');
  return users;
};

export const authConfig: NextAuthConfig = {
  providers: [
    // Credentials provider - checks DATABASE_URL at runtime in authorize()
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Check database availability at runtime
        if (!process.env.DATABASE_URL) {
          console.error('DATABASE_URL not configured');
          return null;
        }

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const db = await getDb();
        const users = await getUsers();
        if (!db || !users) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await compare(credentials.password as string, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
    // OAuth providers - configured if env vars exist at runtime
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'not-configured',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'not-configured',
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || 'not-configured',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'not-configured',
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/auth/error',
    newUser: '/welcome',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }
      if (account?.provider === 'google' || account?.provider === 'github') {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};
