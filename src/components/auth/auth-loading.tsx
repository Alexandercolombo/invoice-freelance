'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface AuthLoadingProps {
  message?: string;
}

export function AuthLoading({ message = 'Loading...' }: AuthLoadingProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="text-gray-600 dark:text-gray-400">{message}</p>
          <div className="w-full space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
} 