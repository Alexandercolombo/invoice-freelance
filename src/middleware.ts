import { clerkMiddleware, getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your Middleware

const publicRoutes = [
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/uploadthing(.*)",
  "/favicon.ico",
  "/manifest.json",
];

const isPublic = (path: string) => {
  return publicRoutes.some((publicRoute) =>
    path.match(new RegExp(`^${publicRoute}$`))
  );
};

export default clerkMiddleware(async (_, req: NextRequest) => {
  const path = req.nextUrl.pathname;
  
  if (isPublic(path)) {
    return NextResponse.next();
  }

  const { userId } = getAuth(req);
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)", // match all paths except static files
    "/",                      // match root
    "/(api|trpc)(.*)",       // match API routes
  ],
}; 