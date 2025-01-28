'use client';

import { Suspense } from 'react';
import { InvoicesContent } from './invoices-content';
import { LoadingState } from '@/components/loading-state';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { InvoicesErrorBoundary } from '@/components/error-boundaries/invoice-error-boundary';

interface PageProps {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
}

function InvoicesPage({ searchParams }: PageProps) {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push('/sign-in');
    }
  }, [isLoaded, userId, router]);

  if (!isLoaded) {
    return <LoadingState fullScreen={true} />;
  }

  if (!userId) {
    return null;
  }

  return (
    <InvoicesErrorBoundary>
      <InvoicesContent searchParams={searchParams} />
    </InvoicesErrorBoundary>
  );
}

export default function Page({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<LoadingState fullScreen={true} />}>
      <InvoicesPage searchParams={searchParams} />
    </Suspense>
  );
} 