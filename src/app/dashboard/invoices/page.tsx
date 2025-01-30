"use client";

import { Suspense } from "react";
import { InvoicesContent } from "./invoices-content";
import { LoadingState } from "@/components/loading-state";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { InvoicesErrorBoundary } from "@/components/error-boundaries/invoice-error-boundary";

interface PageProps {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  
  return (
    <Suspense fallback={<LoadingState fullScreen={true} />}>
      <InvoicesErrorBoundary>
        <InvoicesContent searchParams={resolvedParams} />
      </InvoicesErrorBoundary>
    </Suspense>
  );
} 