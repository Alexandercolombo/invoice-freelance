"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSearchParams } from "next/navigation";
import { ClientCard } from "@/components/clients/client-card";
import { ClientDialog } from "@/components/clients/client-dialog";
import { ClientDetails } from "@/components/clients/client-details";
import { ClientsContent } from "./clients-content";
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
      <ClientsContent searchParams={resolvedSearchParams} />
    </Suspense>
  );
} 