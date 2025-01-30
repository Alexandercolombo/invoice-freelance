import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes using createRouteMatcher
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/uploadthing(.*)',
  '/favicon.ico',
  '/manifest.json',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
}, { 
  debug: process.env.NODE_ENV === 'development',
  clockSkewInMs: 10000, // Increase clock skew tolerance to 10 seconds
});

// Stop Middleware running on static files and match all other routes
export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 