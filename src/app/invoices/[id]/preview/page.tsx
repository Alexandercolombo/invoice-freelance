import { Suspense } from 'react';
import { InvoicePreviewContent } from './invoice-preview-content';
import { LoadingState } from '@/components/loading-state';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  return (
    <Suspense fallback={<LoadingState fullScreen={true} />}>
      <InvoicePreviewContent params={resolvedParams} />
    </Suspense>
  );
} 