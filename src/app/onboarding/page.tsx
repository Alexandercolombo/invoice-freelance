'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from '@/components/error-boundary';

export default function OnboardingPage() {
  const router = useRouter();
  const user = useQuery(api.users.get);

  // Show loading state while checking for existing user
  if (user === undefined) {
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

  // If user already exists, redirect to dashboard
  if (user) {
    router.replace('/dashboard');
    return null;
  }

  return (
    <ErrorBoundary>
      <OnboardingFlow />
    </ErrorBoundary>
  );
} 