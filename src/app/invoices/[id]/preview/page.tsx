import { Suspense } from 'react';
import { InvoicePreviewContent } from './invoice-preview-content';
import { LoadingState } from '@/components/loading-state';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function Page({ params }: PageProps) {
  return (
    <Suspense fallback={<LoadingState fullScreen={true} />}>
      <InvoicePreviewContent params={params} />
    </Suspense>
  );
} 