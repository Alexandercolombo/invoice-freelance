'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function ErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Component error:', error);
  }, [error]);

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg max-w-2xl mx-auto mt-8 min-h-[200px]">
      <h2 className="text-red-600 font-semibold mb-2">
        Application Error
      </h2>
      <p className="mb-4">{error.message}</p>
      <Button
        onClick={reset}
        variant="destructive"
      >
        Try Again
      </Button>
    </div>
  );
} 