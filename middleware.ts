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
  debug: true
});

// Stop Middleware running on static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next
     * - static (static files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!static|.*\\..*|_next|favicon.ico).*)",
    "/"
  ],
}; 