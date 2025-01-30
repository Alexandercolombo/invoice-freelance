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
  '/_next/(.*)',
  '/assets/(.*)',
]);

export default clerkMiddleware(
  async (auth, request) => {
    console.log('Middleware running for path:', request.nextUrl.pathname);
    
    if (!isPublicRoute(request)) {
      console.log('Protecting route:', request.nextUrl.pathname);
      await auth.protect();
    } else {
      console.log('Public route accessed:', request.nextUrl.pathname);
    }
  },
  {
    debug: process.env.NODE_ENV === 'development',
    clockSkewInMs: 15000, // Increase clock skew tolerance to 15 seconds
    signInUrl: '/sign-in',
    signUpUrl: '/sign-up',
    afterSignInUrl: '/dashboard',
    afterSignUpUrl: '/onboarding',
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 