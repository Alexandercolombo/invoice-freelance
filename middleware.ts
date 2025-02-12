import { NextResponse } from 'next/server';
import { authMiddleware } from '@clerk/nextjs';

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  
  // Skip Clerk middleware for PDF routes to avoid Edge runtime conflicts
  if (url.pathname.match(/^\/api\/invoices\/[^/]+\/pdf/)) {
    console.log('[Debug] Middleware: Skipping Clerk for PDF route:', {
      pathname: url.pathname,
      runtime: process.env.NEXT_RUNTIME
    });
    return NextResponse.next();
  }

  // Use Clerk middleware for all other routes
  console.log('[Debug] Middleware: Using Clerk for route:', {
    pathname: url.pathname,
    runtime: process.env.NEXT_RUNTIME
  });
  
  // Use authMiddleware for Clerk authentication
  return authMiddleware({
    publicRoutes: ['/api/invoices/.*/pdf']
  })(request);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // Always run for API routes
    '/api/:path*'
  ]
}; 