import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',  // Allow all sign-in related routes
  '/sign-up(.*)',  // Allow all sign-up related routes
  '/api(.*)',      // Allow API routes (they'll be protected individually)
  '/onboarding(.*)', // Allow onboarding flow
  // Static assets and resources
  '/favicon.ico',
  '/public/(.*)'
]);

// Define protected dashboard routes
const isDashboardRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/invoices(.*)',
  '/settings/(?!account)(.*)'  // All settings except personal account
]);

// Define personal account routes
const isPersonalRoute = createRouteMatcher([
  '/settings/account(.*)'  // Personal account settings
]);

export default clerkMiddleware((auth, request) => {
  // Check if it's a public route first
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // Handle dashboard routes
  if (isDashboardRoute(request)) {
    auth.protect();
    return NextResponse.next();
  }

  // Handle personal account routes
  if (isPersonalRoute(request)) {
    auth.protect();
    return NextResponse.next();
  }

  // By default, protect all other routes that aren't explicitly public
  auth.protect();
  return NextResponse.next();
}, {
  organizationSyncOptions: {
    organizationPatterns: [
      '/dashboard/:orgId(.*)',
      '/invoices/:orgId(.*)',
      '/settings/:orgId/(.*)'
    ],
    personalAccountPatterns: ['/settings/account(.*)']
  }
});

export const config = {
  matcher: [
    // Skip all internal Next.js assets and static files
    '/((?!_next/static|_next/image|.*\\.(?:jpg|jpeg|gif|png|svg|ico)$).*)',
    // Include all API routes
    '/(api|trpc)(.*)'
  ],
}; 