'use client';

import { ReactNode, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import { LoadingState } from '@/components/loading-state';

interface Props {
  children: ReactNode;
}

export function ConvexClientProvider({ children }: Props) {
  const { isLoaded } = useAuth();
  
  const convex = useMemo(() => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('Missing NEXT_PUBLIC_CONVEX_URL environment variable');
    }
    return new ConvexReactClient(convexUrl);
  }, []);

  // Wait for auth to be loaded before rendering children
  if (!isLoaded) {
    return <LoadingState message="Loading authentication..." fullScreen={true} />;
  }

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
} 