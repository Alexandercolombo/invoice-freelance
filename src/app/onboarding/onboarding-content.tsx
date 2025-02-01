'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useConvexAuth } from 'convex/react';
import { useAuth } from "@clerk/nextjs";
import { api } from '../../../convex/_generated/api';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

export function OnboardingContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();
  
  // Don't make any queries if we're not authenticated
  const shouldFetchData = isAuthenticated && isSignedIn && !isConvexLoading && isClerkLoaded;
  const user = useQuery(api.users.get, shouldFetchData ? undefined : "skip");

  // Show loading state while checking auth and user
  if (isConvexLoading || !isClerkLoaded) {
    return <LoadingSkeleton />;
  }

  // Show auth error if not authenticated
  if (!isAuthenticated || !isSignedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <div className="text-red-500">Please sign in to continue onboarding.</div>
        <Button onClick={() => router.push('/sign-in')}>Sign In</Button>
      </div>
    );
  }

  // Handle case where queries were skipped
  if (!shouldFetchData) {
    return <LoadingSkeleton />;
  }

  // Show loading state while checking for existing user
  if (user === undefined) {
    return <LoadingSkeleton />;
  }

  // If user already exists, redirect to dashboard
  if (user) {
    router.replace('/dashboard');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-600">Redirecting to dashboard...</p>
      </div>
    );
  }

  // If we get here, user is authenticated but hasn't completed onboarding
  return <OnboardingFlow />;
} 