"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useSearchParams } from "next/navigation";
import { CreateInvoiceModal } from "@/components/invoices/create-invoice-modal";

export default function NewInvoicePage() {
  const searchParams = useSearchParams();
  const selectedTaskIds = searchParams
    .get("tasks")
    ?.split(",")
    .filter(Boolean)
    .map((id) => id as Id<"tasks_v2">);

  if (!selectedTaskIds?.length) {
    return null;
  }

  return <CreateInvoiceModal open={true} onClose={() => window.history.back()} />;
} 