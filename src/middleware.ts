import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/uploadthing(.*)', // Allow uploadthing API routes
  '/404',
  '/_not-found',
  '/favicon.ico',
  '/manifest.json'
]);

// Define organization-specific routes
const organizationPatterns = [
  '/dashboard/:id/(.*)',
  '/dashboard/:slug/(.*)'
];

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    return auth.protect().then(() => NextResponse.next());
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip static files and Next.js internals
    '/((?!_next/static|_next/image|assets|favicon.ico).*)',
    // Always run for API routes
    '/(api|trpc)(.*)'
  ]
}; 