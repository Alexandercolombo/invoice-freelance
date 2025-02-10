"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { CreateInvoiceModal } from "@/components/invoices/create-invoice-modal";

interface NewInvoiceContentProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export function NewInvoiceContent({ searchParams }: NewInvoiceContentProps) {
  const selectedTaskIds = (searchParams["tasks"] as string)
    ?.split(",")
    .filter(Boolean)
    .map((id) => id as Id<"tasks_v2">);

  const tasks = useQuery(api.tasks.getTasksByIds, { ids: selectedTaskIds ?? [] }) ?? [];
  const clients = useQuery(api.clients.getAll, {
    paginationOpts: { numToSkip: 0, numToTake: 100 }
  }) ?? { clients: [], totalCount: 0 };

  if (!selectedTaskIds?.length || !tasks.length || !clients.clients) {
    return null;
  }

  const selectedTasksSet = new Set(selectedTaskIds);
  
  return (
    <CreateInvoiceModal
      isOpen={true}
      onClose={() => window.history.back()}
      selectedTasks={selectedTasksSet}
      tasks={tasks}
      clients={clients.clients}
    />
  );
} 