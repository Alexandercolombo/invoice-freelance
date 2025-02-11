import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[Debug] Minimal route called:', {
      invoiceId: params.id,
      url: request.url,
      runtime: process.env.NEXT_RUNTIME
    });

    // Get the auth session
    const authRequest = await auth();
    const { userId } = authRequest;
    if (!userId) {
      console.log('[Debug] Unauthorized - No userId found');
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      }, { 
        status: 401
      });
    }

    // Get the Convex token
    const token = await authRequest.getToken({ template: 'convex' });
    if (!token) {
      console.error('[Error] Failed to get Convex token');
      return NextResponse.json({
        error: 'Authentication Error',
        message: 'Failed to get authentication token'
      }, { 
        status: 500
      });
    }

    console.log('[Debug] Auth successful:', { 
      userId, 
      hasToken: !!token,
      runtime: process.env.NEXT_RUNTIME
    });

    return NextResponse.json({
      message: 'Hello PDF minimal route',
      id: params.id,
      userId,
      runtime: process.env.NEXT_RUNTIME
    });
  } catch (err) {
    console.error('[Error] Minimal route error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
} 