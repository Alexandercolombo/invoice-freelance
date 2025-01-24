import { Suspense } from "react";
import { NewInvoiceContent } from "./new-invoice-content";
import { LoadingState } from "@/components/loading-state";

interface PageProps {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  
  return (
    <Suspense fallback={<LoadingState fullScreen={true} />}>
      <NewInvoiceContent searchParams={resolvedSearchParams} />
    </Suspense>
  );
} 