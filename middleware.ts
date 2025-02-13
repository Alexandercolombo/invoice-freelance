import { authMiddleware } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

// Export Clerk's authMiddleware with configuration
export default authMiddleware({
  // Add public routes that don't require authentication
  publicRoutes: ['/api/invoices/.*/pdf'],
  ignoredRoutes: ['/api/invoices/.*/pdf'],
  // Optional: Add debug logging
  beforeAuth: (req) => {
    const url = new URL(req.url);
    console.log('[Debug] Middleware beforeAuth:', {
      pathname: url.pathname,
      runtime: process.env.NEXT_RUNTIME
    });
    return NextResponse.next();
  },
  afterAuth: (auth, req) => {
    const url = new URL(req.url);
    console.log('[Debug] Middleware afterAuth:', {
      pathname: url.pathname,
      runtime: process.env.NEXT_RUNTIME,
      userId: auth.userId
    });
    return NextResponse.next();
  }
});

// Ensure middleware doesn't run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/invoices/.*/pdf (PDF routes)
     */
    "/((?!api/invoices/[^/]+/pdf|_next/static|_next/image|favicon.ico).*)",
  ],
}; 