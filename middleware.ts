import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

export default async function middleware(req: NextRequest) {
  const { userId } = getAuth(req);
  
  // Debug logging
  const url = new URL(req.url);
  console.log('[Debug] Middleware:', {
    pathname: url.pathname,
    runtime: process.env.NEXT_RUNTIME,
    userId
  });

  return NextResponse.next();
}

// Configure middleware to run on all routes
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}; 