/**
 * @fileoverview This is a server-only middleware for handling authentication and route protection.
 * Minimal version for testing route functionality.
 */

import { authMiddleware } from "@clerk/nextjs";

// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your Middleware
export default authMiddleware({
  // Allow public access to specific routes
  publicRoutes: [
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/webhooks(.*)",
    "/api/uploadthing(.*)"
  ],
  // Routes that can be accessed while signed in or signed out
  ignoredRoutes: [
    "/api/webhooks(.*)",
    "/api/uploadthing(.*)"
  ],
  debug: true,
  beforeAuth: (req) => {
    console.log('[Debug] Middleware beforeAuth:', {
      path: req.nextUrl.pathname,
      method: req.method
    });
    return null;
  },
  afterAuth: (auth, req) => {
    console.log('[Debug] Middleware afterAuth:', {
      path: req.nextUrl.pathname,
      method: req.method,
      userId: auth.userId
    });
    return null;
  }
});

// Stop Middleware running on static files
export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)']
}; 