import { authMiddleware } from "@clerk/nextjs/dist/server";
import { NextRequest } from "next/server";

// Export Clerk's authMiddleware with configuration
export default authMiddleware({
  // Debug mode to help troubleshoot auth issues
  debug: true,
  
  // Public routes that don't require authentication
  publicRoutes: ["/", "/sign-in", "/sign-up"],
  
  // Optional: Add any custom beforeAuth or afterAuth logic
  beforeAuth: (req: NextRequest) => {
    const url = new URL(req.url);
    console.log('[Debug] Clerk Middleware beforeAuth:', {
      pathname: url.pathname,
      runtime: process.env.NEXT_RUNTIME
    });
    return;
  },
  afterAuth: (auth, req: NextRequest) => {
    const url = new URL(req.url);
    console.log('[Debug] Clerk Middleware afterAuth:', {
      pathname: url.pathname,
      runtime: process.env.NEXT_RUNTIME,
      userId: auth.userId
    });
    return;
  }
});

// Configure middleware to run on all routes except specific paths
export const config = {
  matcher: [
    // Match all paths except:
    "/((?!_next/static|_next/image|favicon.ico|api/invoices/[id]/pdf).*)",
    // Optional: Add other paths that should be protected but aren't caught by the negative lookahead above
    "/dashboard/:path*",
    "/invoices/:path*"
  ]
}; 