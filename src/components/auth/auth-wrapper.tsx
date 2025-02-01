'use client';

import { useRouter } from 'next/navigation';
import { useConvexAuth } from 'convex/react';
import { useAuth } from '@clerk/nextjs';
import { AuthLoading } from './auth-loading';
import { Button } from '@/components/ui/button';

interface AuthWrapperProps {
  children: React.ReactNode;
  loadingMessage?: string;
  requireAuth?: boolean;
}

function AuthDebugger() {
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();

  console.log('Auth Debug State:', {
    convex: { loading: isConvexLoading, authenticated: isAuthenticated },
    clerk: { loaded: isClerkLoaded, signedIn: isSignedIn }
  });

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

    return <>{children}</>;
  }
} 