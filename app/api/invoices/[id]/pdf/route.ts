import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

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

    // Get the auth session
    const authRequest = await auth();
    const { userId } = authRequest;
    if (!userId) {
      console.log('[Debug] Unauthorized - No userId found');
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          message: 'Authentication required'
        }), { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          }
        }
      );
    }

    // Get the Convex token
    const token = await authRequest.getToken({ template: 'convex' });
    if (!token) {
      console.error('[Error] Failed to get Convex token');
      return new Response(
        JSON.stringify({
          error: 'Authentication Error',
          message: 'Failed to get authentication token'
        }), { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          }
        }
      );
    }

    console.log('[Debug] Auth successful:', { 
      userId, 
      hasToken: !!token,
      runtime: process.env.NEXT_RUNTIME
    });

    return new Response(
      JSON.stringify({
        message: 'Hello PDF minimal route',
        id: params.id,
        userId,
        runtime: process.env.NEXT_RUNTIME
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  } catch (err) {
    console.error('[Error] PDF route error:', err);
    return new Response(
      JSON.stringify({ 
        error: (err as Error).message,
        stack: (err as Error).stack
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  }
} 