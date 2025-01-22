import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export default authMiddleware({
  publicRoutes: [
    "/",
    "/sign-in",
    "/sign-up",
    "/api/webhooks(.*)",
  ],
  afterAuth(auth, req) {
    // Get the intended destination from the URL or default to dashboard
    const redirectTo = new URL(req.url).searchParams.get('redirect_to') || '/dashboard';
    
    // Handle users who aren't authenticated
    if (!auth.userId && !auth.isPublicRoute) {
      const signInUrl = new URL('/sign-in', req.url);
      // Preserve the intended destination
      signInUrl.searchParams.set('redirect_to', req.url);
      return NextResponse.redirect(signInUrl);
    }

    // If user is signed in and trying to access auth pages, redirect to dashboard
    if (auth.userId && (req.url.includes('/sign-in') || req.url.includes('/sign-up'))) {
      return NextResponse.redirect(new URL(redirectTo, req.url));
    }

    // If the user is signed in and trying to access a protected route, allow them
    if (auth.userId && !auth.isPublicRoute) {
      return NextResponse.next();
    }

    // Allow users visiting public routes to access them
    return NextResponse.next();
  },
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}; 