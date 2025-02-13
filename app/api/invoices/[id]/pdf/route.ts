import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[Debug] PDF route called:', {
      invoiceId: params.id,
      url: request.url,
      method: request.method,
      runtime: process.env.NEXT_RUNTIME,
      headers: Object.fromEntries(request.headers)
    });

    // Get auth session using getAuth() instead of auth()
    const { userId, sessionId, getToken } = getAuth(request);
    
    if (!userId || !sessionId) {
      console.log('[Debug] Unauthorized - No userId or sessionId found');
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      }, { 
        status: 401,
        headers: {
          'Cache-Control': 'no-store'
        }
      });
    }

    // Get the Convex token if needed
    const token = await getToken({ template: 'convex' });
    if (!token) {
      console.error('[Error] Failed to get Convex token');
      return NextResponse.json({
        error: 'Authentication Error',
        message: 'Failed to get authentication token'
      }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store'
        }
      });
    }

    console.log('[Debug] Auth successful:', { 
      userId,
      sessionId,
      hasToken: !!token,
      runtime: process.env.NEXT_RUNTIME
    });

    return NextResponse.json({
      message: 'Hello PDF route with Clerk auth',
      id: params.id,
      userId,
      sessionId,
      runtime: process.env.NEXT_RUNTIME
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    console.error('[Error] PDF route error:', err);
    return NextResponse.json({ 
      error: (err as Error).message,
      stack: (err as Error).stack
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }
} 