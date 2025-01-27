"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { CreateInvoiceModal } from "@/components/invoices/create-invoice-modal";
import { EditInvoiceModal } from "@/components/invoices/edit-invoice-modal";
import { Id } from "../../../convex/_generated/dataModel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ErrorBoundary } from '@/components/error-boundary';
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type Invoice = {
  _id: Id<"invoices">;
  number: string;
  date: string;
  dueDate?: string;
  status: "draft" | "sent" | "paid";
  total: number;
  tax?: number;
  notes?: string;
  client?: {
    name: string;
    email: string;
  } | null;
};

export default function InvoicesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<Id<"tasks_v2">>>(new Set());
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  
  const deleteInvoice = useMutation(api.invoices.deleteInvoice)
    .withOptimisticUpdate(({ setQuery }) => {
      // Add optimistic update logic here
    });
  
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

  if (invoices === undefined || tasks === undefined || clients.clients === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Invoices</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!invoices || !tasks || !clients.clients) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-red-500">Failed to load required data</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Invoices</h1>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {invoices.map((invoice) => {
            const isPastDue = invoice.dueDate ? new Date(invoice.dueDate) < new Date() : false;
            const isDueSoon = invoice.dueDate ? new Date(invoice.dueDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : false;
            const dueDateLabel = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A";

            return (
              <Card key={invoice._id} className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold">{invoice.number}</h3>
                    <p className="text-sm text-gray-500">{invoice.client?.name}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingInvoice(invoice)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this invoice? This action cannot be undone.
                            The tasks associated with this invoice will be marked as unbilled.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteInvoice({ id: invoice._id })}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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
                    <span className={cn({
                      "text-red-600": isPastDue,
                      "text-amber-600": isDueSoon,
                      "text-green-600": !isPastDue && !isDueSoon
                    })}>
                      {dueDateLabel}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {invoices.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="mb-4 text-gray-400">📄</div>
            <h3 className="text-lg font-semibold">No Invoices Yet</h3>
            <p className="text-gray-500 mt-2">
              Get started by creating your first invoice
            </p>
          </motion.div>
        )}

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

        {editingInvoice && (
          <EditInvoiceModal
            isOpen={true}
            onClose={() => setEditingInvoice(null)}
            invoice={editingInvoice}
          />
        )}
      </div>
    </ErrorBoundary>
  );
} 