"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { TaskList } from "@/components/tasks/task-list";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export default function NewInvoicePage() {
  const router = useRouter();
  const [selectedTaskIds, setSelectedTaskIds] = useState<Id<"tasks">[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tasks = useQuery(api.tasks.getTasksByIds, { 
    ids: selectedTaskIds 
  }) || [];
  
  const clientsData = useQuery(api.clients.getAll, {
    paginationOpts: {
      numToSkip: 0,
      numToTake: 100
    }
  });
  const clients = clientsData?.clients || [];
  const createInvoice = useMutation(api.invoices.createInvoice);

  const handleTaskSelect = (taskId: Id<"tasks">) => {
    setSelectedTaskIds(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId);
      }
      return [...prev, taskId];
    });
  };

  const handleSubmit = async (data: {
    clientId: Id<"clients">;
    taskIds: Id<"tasks">[];
    date: string;
    dueDate: string;
    notes: string;
    tax: number;
  }) => {
    try {
      setIsSubmitting(true);
      const invoiceId = await createInvoice(data);
      router.push(`/dashboard/invoices/${invoiceId}`);
    } catch (error) {
      console.error("Failed to create invoice:", error);
      setWarnings(prev => [...prev, "Failed to create invoice. Please try again."]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="grid gap-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Create New Invoice
          </h1>
          <p className="text-sm text-muted-foreground">
            Select tasks and enter invoice details
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Select Tasks</h2>
            <TaskList
              tasks={tasks}
              selectedIds={selectedTaskIds}
              onSelect={handleTaskSelect}
            />
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold mb-4">Invoice Details</h2>
            <InvoiceForm
              tasks={tasks}
              clients={clients}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              warnings={warnings}
            />
          </Card>
        </div>
      </div>
    </div>
  );
} 