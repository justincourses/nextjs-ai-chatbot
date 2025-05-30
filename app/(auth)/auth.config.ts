import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
    signOut: '/login',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // Public routes that don't require authentication
      const publicRoutes = ['/login', '/register'];
      const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

      // API routes - let them handle their own auth
      if (pathname.startsWith('/api/')) {
        return true;
      }

      // If user is logged in and trying to access auth pages, redirect to home
      if (isLoggedIn && isPublicRoute) {
        return Response.redirect(new URL('/', nextUrl));
      }

      // If user is not logged in and trying to access protected routes, redirect to login
      if (!isLoggedIn && !isPublicRoute) {
        return Response.redirect(new URL('/login', nextUrl));
      }

      // Allow access
      return true;
    },
  },
} satisfies NextAuthConfig;
