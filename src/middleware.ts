/**
 * @fileoverview This is a server-only middleware for handling authentication and route protection.
 */

import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public routes that don't require authentication
const publicPaths = [
  "/",
  "/sign-in*",
  "/sign-up*",
  "/api/webhooks*", // If you have any webhook endpoints
];

const isPublic = (path: string) => {
  return publicPaths.find((x) =>
    path.match(new RegExp(`^${x}$`.replace("*$", "($|/)")))
  );
};

export default clerkMiddleware((auth, req) => {
  if (!req.nextUrl) return NextResponse.next();
  
  const path = req.nextUrl.pathname;
  
  if (isPublic(path)) {
    return NextResponse.next();
  }

  // For everything else, require authentication
  try {
    // Let Clerk handle the authentication
    auth.protect();
    return NextResponse.next();
  } catch (err) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
});

// See https://clerk.com/docs/references/nextjs/auth-middleware
export const config = {
  matcher: [
    // Match all paths except static files and favicon
    "/((?!.+\\.[\\w]+$|_next).*)",
    // Match API routes
    "/(api|trpc)(.*)"
  ]
}; 