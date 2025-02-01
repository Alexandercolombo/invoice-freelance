'use client';

import { useRouter } from 'next/navigation';
import { useConvexAuth } from 'convex/react';
import { useAuth } from '@clerk/nextjs';
import { AuthLoading } from './auth-loading';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface AuthWrapperProps {
  children: React.ReactNode;
  loadingMessage?: string;
  requireAuth?: boolean;
}

function AuthDebugger() {
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    console.log('Auth Debug State:', {
      convex: { loading: isConvexLoading, authenticated: isAuthenticated },
      clerk: { loaded: isClerkLoaded, signedIn: isSignedIn }
    });
  }, [isConvexLoading, isAuthenticated, isClerkLoaded, isSignedIn]);

  return null;
}

export function AuthWrapper({ 
  children, 
  loadingMessage = 'Loading...', 
  requireAuth = true 
}: AuthWrapperProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();
  const [error, setError] = useState<Error | null>(null);

  // Handle errors
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <div className="text-red-500">An error occurred while checking authentication.</div>
        <div className="text-sm text-gray-600">{error.message}</div>
        <Button onClick={() => setError(null)}>Try Again</Button>
      </div>
    );
  }

  try {
    // Add debug component in development
    if (process.env.NODE_ENV === 'development') {
      return (
        <>
          <AuthDebugger />
          {renderContent()}
        </>
      );
    }

    return renderContent();
  } catch (e) {
    setError(e instanceof Error ? e : new Error('An unexpected error occurred'));
    return <AuthLoading message="Error occurred, retrying..." />;
  }

  function renderContent() {
    // Show loading state while checking auth
    if (isConvexLoading || !isClerkLoaded) {
      return <AuthLoading message={loadingMessage} />;
    }

    // Handle unauthenticated state when auth is required
    if (requireAuth && (!isAuthenticated || !isSignedIn)) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
          <div className="text-red-500">Please sign in to continue.</div>
          <Button onClick={() => router.push('/sign-in')}>Sign In</Button>
        </div>
      );
    }

    // Always return valid JSX
    return <div className="min-h-screen">{children}</div>;
  }
} 