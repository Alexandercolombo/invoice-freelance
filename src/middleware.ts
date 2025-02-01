import { clerkMiddleware } from '@clerk/nextjs/server';

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip all internal Next.js assets and static files
    '/((?!_next/static|_next/image|.*\\.(?:jpg|jpeg|gif|png|svg|ico)$).*)',
    // Include all API routes
    '/(api|trpc)(.*)'
  ],
}; 