import { Suspense } from 'react';
import { InvoicePreviewContent } from './invoice-preview-content';
import { LoadingState } from '@/components/loading-state';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  
  return (
    <Suspense fallback={<LoadingState fullScreen={true} />}>
      <InvoicePreviewContent 
        params={resolvedParams}
        searchParams={resolvedSearchParams}
      />
    </Suspense>
  );
} 