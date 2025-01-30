import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes using createRouteMatcher
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in',
  '/sign-up',
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

// Simplified matcher configuration
export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)", // Match all routes except static files
    "/",
    "/(api|trpc)(.*)", // Match API routes
  ],
}; 