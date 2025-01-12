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

export default function InvoicesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<Id<"tasks_v2">>>(new Set());
  const [editingInvoice, setEditingInvoice] = useState<{
    _id: Id<"invoices">;
    dueDate?: string;
    tax?: number;
    notes?: string;
    status: "draft" | "sent" | "paid";
  } | null>(null);
  
  const deleteInvoice = useMutation(api.invoices.deleteInvoice);
  
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
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  invoice.status === "paid" 
                    ? "bg-green-100 text-green-800"
                    : invoice.status === "sent"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingInvoice({
                      _id: invoice._id,
                      dueDate: invoice.dueDate,
                      tax: invoice.tax,
                      notes: invoice.notes,
                      status: invoice.status,
                    })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-red-100 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
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

      {editingInvoice && (
        <EditInvoiceModal
          isOpen={true}
          onClose={() => setEditingInvoice(null)}
          invoice={editingInvoice}
        />
      )}
    </div>
  );
} 