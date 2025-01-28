'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  error: Error;
  reset: () => void;
  children: React.ReactNode;
}

export function ErrorBoundary({
  error,
  reset,
  children,
}: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('Component error:', error);
  }, [error]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg max-w-2xl mx-auto mt-8 min-h-[200px]">
        <h2 className="text-red-600 font-semibold mb-2">
          Application Error
        </h2>
        <p className="mb-4">{error.message}</p>
        <Button
          onClick={reset}
          variant="destructive"
          type="button"
          size="default"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return children;
} 