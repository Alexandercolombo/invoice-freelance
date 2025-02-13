import { authMiddleware, clerkClient } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

// Export Clerk's authMiddleware with configuration
export default authMiddleware({
  // Add public routes that don't require authentication
  publicRoutes: ['/api/invoices/.*/pdf'],
  ignoredRoutes: ['/api/invoices/.*/pdf'],
  // Optional: Add debug logging
  beforeAuth: (req: NextRequest) => {
    const url = new URL(req.url);
    console.log('[Debug] Middleware beforeAuth:', {
      pathname: url.pathname,
      runtime: process.env.NEXT_RUNTIME
    });
    return NextResponse.next();
  },
  afterAuth: (auth, req: NextRequest) => {
    const url = new URL(req.url);
    console.log('[Debug] Middleware afterAuth:', {
      pathname: url.pathname,
      runtime: process.env.NEXT_RUNTIME,
      userId: auth.userId
    });
    return NextResponse.next();
  }
});

// Match all paths except static files and PDF routes
export const config = {
  matcher: [
    "/((?!api/invoices/[^/]+/pdf|_next/static|_next/image|favicon.ico).*)"
  ]
}; 