/**
 * @fileoverview This is a server-only middleware for handling authentication and route protection.
 */

import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public routes that don't require authentication
const publicRoutes = [
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/uploadthing(.*)" // Allow uploadthing API routes
];

export default authMiddleware({
  publicRoutes,
  ignoredRoutes: [
    "/api/webhooks(.*)",
    "/api/uploadthing(.*)"
  ],
  afterAuth(auth, req) {
    // Handle unauthorized access to private routes
    if (!auth.userId && !publicRoutes.some(pattern => {
      const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
      return regex.test(req.nextUrl.pathname);
    })) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
  },
});

// See https://clerk.com/docs/references/nextjs/auth-middleware
export const config = {
  matcher: [
    // Match all paths except static files and favicon
    "/((?!.+\\.[\\w]+$|_next).*)",
    // Match API routes
    "/(api|trpc)(.*)"
  ]
}; 