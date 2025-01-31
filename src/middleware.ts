import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes using createRouteMatcher
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',  // Add wildcard to match all sign-in routes
  '/sign-up(.*)',  // Add wildcard to match all sign-up routes
  '/api/webhooks(.*)',
  '/api/uploadthing(.*)',
]);

export default clerkMiddleware(
  async (auth, request) => {
    console.log('[Clerk Debug] Request path:', request.nextUrl.pathname);
    console.log('[Clerk Debug] Is public route:', isPublicRoute(request));
    
    if (!isPublicRoute(request)) {
      console.log('[Clerk Debug] Protecting route:', request.nextUrl.pathname);
      await auth.protect();
    } else {
      console.log('[Clerk Debug] Public route accessed:', request.nextUrl.pathname);
    }
  },
  {
    debug: true, // Enable debug mode
    clockSkewInMs: 15000,
    signInUrl: '/sign-in',
    signUpUrl: '/sign-up',
    afterSignInUrl: '/dashboard',
    afterSignUpUrl: '/onboarding',
  }
);

// Update matcher configuration to properly handle Clerk routes
export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)", // Exclude static files and _next
    "/", // Include root
    "/(api|trpc)(.*)", // Include API routes
  ],
}; 