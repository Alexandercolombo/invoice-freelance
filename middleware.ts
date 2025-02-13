import { authMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Export Clerk's authMiddleware with configuration
export default authMiddleware({
  // Add public routes that don't require authentication
  publicRoutes: ['/api/invoices/.*/pdf'],
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

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // Always run for API routes
    '/api/:path*'
  ]
}; 