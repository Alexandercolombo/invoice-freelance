'use client';

import { ReactNode, useMemo, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import { LoadingState } from '@/components/loading-state';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

// Separate component to handle ensuring user exists
function UserEnsurer() {
  const { isSignedIn } = useAuth();
  const ensureUser = useMutation(api.users.ensureUser);

  useEffect(() => {
    if (isSignedIn) {
      console.log('[Debug] Calling ensureUser');
      ensureUser()
        .then((user) => {
          console.log('[Debug] ensureUser success:', { hasUser: !!user });
        })
        .catch((error) => {
          console.error('[Error] ensureUser failed:', error);
        });
    }
  }, [isSignedIn, ensureUser]);

  return null;
}

interface Props {
  children: ReactNode;
}

export function ConvexClientProvider({ children }: Props) {
  const { isLoaded, isSignedIn } = useAuth();
  
  const convex = useMemo(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.error('Missing NEXT_PUBLIC_CONVEX_URL environment variable');
      return null;
    }
    return new ConvexReactClient(convexUrl);
  }, []);

  if (!convex) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Configuration Error: Missing Convex URL</div>
      </div>
    );
  }

  // Wait for auth to be loaded before rendering children
  if (!isLoaded) {
    return <LoadingState message="Loading authentication..." fullScreen={true} />;
  }

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <UserEnsurer />
      {children}
    </ConvexProviderWithClerk>
  );
} 