import { compare } from 'bcrypt-ts';
import NextAuth, { type User, type Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';

import { getUser, getUserById } from '@/lib/db/queries';
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema';

import { authConfig } from './auth.config';

interface ExtendedSession extends Session {
  user: User;
}

// Helper function to create OAuth user in database
async function createOAuthUser(user: any) {
  try {
    // Check if user already exists
    const existingUser = await getUserById(user.id);
    if (existingUser) {
      return existingUser;
    }

    // Create new user
    await db.insert(users).values({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    });

    return await getUserById(user.id);
  } catch (error) {
    console.error('Failed to create OAuth user:', error);
    return null;
  }
}

const nextAuth = NextAuth({
  ...authConfig,
  // Temporarily disable adapter to restore functionality
  // adapter: DrizzleAdapter(db, {
  //   usersTable: users,
  //   accountsTable: accounts,
  //   sessionsTable: sessions,
  //   verificationTokensTable: verificationTokens,
  // }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        const users = await getUser(email);
        if (users.length === 0) return null;
        // biome-ignore lint: Forbidden non-null assertion.
        const passwordsMatch = await compare(password, users[0].password!);
        if (!passwordsMatch) return null;
        return users[0] as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;

        // If this is an OAuth login, ensure user exists in database
        if (account && (account.provider === 'google' || account.provider === 'github')) {
          await createOAuthUser(user);
        }
      }
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: ExtendedSession;
      token: any;
    }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }

      return session;
    },
  },
});

export const { handlers, auth, signIn, signOut } = nextAuth;
export const { GET, POST } = handlers;
