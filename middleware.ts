/**
 * @fileoverview This is a server-only middleware for handling authentication and route protection.
 * Minimal version for testing route functionality.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only match non-api routes
    "/((?!api|_next/static|_next/image|favicon.ico).*)"
  ]
}; 