import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

// Export Clerk's authMiddleware with configuration
export default authMiddleware({
  // Debug mode to help troubleshoot auth issues
  debug: true,
  
  // Public routes that don't require authentication
  publicRoutes: ["/", "/sign-in", "/sign-up"],
  
  afterAuth(auth, req) {
    // Handle authenticated requests
    const url = new URL(req.url);
    console.log('[Debug] Clerk Middleware:', {
      pathname: url.pathname,
      isAuthenticated: !!auth.userId,
      runtime: process.env.NEXT_RUNTIME
    });
  }
});

// Configure middleware matcher to exclude static files and include API routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * Note: This is a custom matcher function that differs from the default
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
    "/",
    "/(api|trpc)(.*)"
  ],
}; 