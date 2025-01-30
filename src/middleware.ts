import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/uploadthing(.*)', // Allow uploadthing API routes
  '/_next(.*)', // Allow Next.js internals
  '/favicon.ico',
  '/manifest.json',
  '/assets/(.*)', // Allow static assets
  '/images/(.*)', // Allow images
  '/fonts/(.*)', // Allow fonts
  '/404',
  '/_not-found'
]);

export default clerkMiddleware(
  async (auth, request) => {
    // Add debug logging
    console.log('Middleware processing request:', request.url);
    console.log('Is public route:', isPublicRoute(request));
    
    if (!isPublicRoute(request)) {
      console.log('Protecting route:', request.url);
      await auth.protect();
    }
  },
  {
    debug: process.env.NODE_ENV === 'development', // Enable debug logs in development
    clockSkewInMs: 10000, // Increase clock skew tolerance to 10 seconds
  }
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 