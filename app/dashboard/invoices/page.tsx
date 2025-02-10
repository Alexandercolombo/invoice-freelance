"use client";

import { Suspense } from "react";
import { InvoicesContent } from "./invoices-content";
import { LoadingState } from "@/components/loading-state";
import { useConvexAuth } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function Page({ searchParams }: PageProps) {
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();

  // Debug logging
  useEffect(() => {
    console.log("Page Level Auth Debug:", {
      convex: {
        isAuthenticated,
        isLoading: isConvexLoading
      },
      clerk: {
        isLoaded: isClerkLoaded,
        isSignedIn
      }
    });
  }, [isAuthenticated, isConvexLoading, isClerkLoaded, isSignedIn]);

  // Show loading state while authentication is being checked
  if (isConvexLoading || !isClerkLoaded) {
    return <LoadingState fullScreen message="Checking authentication..." />;
  }

  // Show error if not authenticated
  if (!isAuthenticated || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-600">Authentication Required</h1>
          <p className="mt-2 text-gray-600">Please sign in to view invoices.</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingState fullScreen message="Loading invoices..." />}>
      <InvoicesContent searchParams={searchParams} />
    </Suspense>
  );
} 