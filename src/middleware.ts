/**
 * @fileoverview This is a server-only middleware for handling authentication and route protection.
 */

import 'server-only';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api(.*)',
  '/onboarding(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }
  
  await auth.protect();
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/(api|trpc)(.*)'
  ]
}; 