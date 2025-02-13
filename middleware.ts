import { authMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { AuthObject } from '@clerk/nextjs/server';

// Export Clerk's authMiddleware with configuration
export default authMiddleware({
  // Debug logging
  beforeAuth: (req: NextRequest) => {
    const url = new URL(req.url);
    console.log('[Debug] Middleware beforeAuth:', {
      pathname: url.pathname,
      runtime: process.env.NEXT_RUNTIME
    });
    return NextResponse.next();
  },
  afterAuth: (auth: AuthObject, req: NextRequest) => {
    const url = new URL(req.url);
    console.log('[Debug] Middleware afterAuth:', {
      pathname: url.pathname,
      runtime: process.env.NEXT_RUNTIME,
      userId: auth.userId
    });
    return NextResponse.next();
  }
});

// Configure middleware to run on all routes
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}; 