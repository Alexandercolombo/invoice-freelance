import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define routes that should be handled by Node.js runtime
const nodeRoutes = createRouteMatcher(['/api/invoices/*/pdf']);

export default clerkMiddleware((auth, req) => {
  console.log('[Debug] Middleware called:', {
    url: req.url,
    method: req.method,
    runtime: process.env.NEXT_RUNTIME,
    isNodeRoute: nodeRoutes(req)
  });
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // Always run for API routes
    '/api/:path*'
  ]
}; 