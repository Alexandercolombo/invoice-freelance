import { Suspense } from 'react';
import { ClientsContent } from "./clients-content";
import { LoadingState } from "@/components/loading-state";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  
  return (
    <Suspense fallback={<LoadingState fullScreen={true} />}>
      <ClientsContent searchParams={resolvedParams} />
    </Suspense>
  );
} 