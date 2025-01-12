"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { CreateInvoiceModal } from "@/components/invoices/create-invoice-modal";
import { Id } from "../../../convex/_generated/dataModel";

export default function InvoicesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<Id<"tasks_v2">>>(new Set());
  
  const invoices = useQuery(api.invoices.getAllInvoices, {
    paginationOpts: {
      numToSkip: 0,
      numToTake: 100
    }
  });

  const tasks = useQuery(api.tasks.getRecentTasks) ?? [];
  const clients = useQuery(api.clients.getAll, {
    paginationOpts: { numToSkip: 0, numToTake: 100 }
  }) ?? { clients: [], totalCount: 0 };

  if (!invoices || !tasks || !clients.clients) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Invoices</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {invoices.map((invoice) => (
          <Card key={invoice._id} className="p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold">{invoice.number}</h3>
                <p className="text-sm text-gray-500">{invoice.client?.name}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                invoice.status === "paid" 
                  ? "bg-green-100 text-green-800"
                  : invoice.status === "sent"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount:</span>
                <span className="font-medium">{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date:</span>
                <span>{new Date(invoice.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Due Date:</span>
                <span>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A"}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <CreateInvoiceModal 
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedTasks(new Set());
        }}
        selectedTasks={selectedTasks}
        tasks={tasks}
        clients={clients.clients}
      />
    </div>
  );
} 