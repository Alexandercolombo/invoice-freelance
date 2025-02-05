'use client';

import { useState, useEffect } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { api } from "../../../convex/_generated/api";
import { formatCurrency, cn } from "@/lib/shared-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { CreateInvoiceModal } from "@/components/invoices/create-invoice-modal";
import { EditInvoiceModal } from "@/components/invoices/edit-invoice-modal";
import { Id } from "../../../convex/_generated/dataModel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { Client } from "@/types";

interface InvoicesContentProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

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

// Update type for clients response to be more explicit
type ClientsResponse = {
  clients: Array<Client>;
  totalCount: number;
};

function LoadingSkeleton() {
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

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg"
    >
      <div className="mb-4 text-gray-400">📄</div>
      <h3 className="text-lg font-semibold">No Invoices Yet</h3>
      <p className="text-gray-500 mt-2">
        Get started by creating your first invoice
      </p>
    </motion.div>
  );
}

function AuthDebugger() {
  const convexAuth = useConvexAuth();
  const clerkAuth = useAuth();
  
  useEffect(() => {
    console.log('Auth Debug State:', {
      convex: {
        isLoading: convexAuth.isLoading,
        isAuthenticated: convexAuth.isAuthenticated
      },
      clerk: {
        isLoaded: clerkAuth.isLoaded,
        isSignedIn: clerkAuth.isSignedIn,
        userId: clerkAuth.userId,
        sessionId: clerkAuth.sessionId
      }
    });
  }, [convexAuth.isLoading, convexAuth.isAuthenticated, clerkAuth.isLoaded, clerkAuth.isSignedIn, clerkAuth.userId, clerkAuth.sessionId]);
  
  return null;
}

export function InvoicesContent({ searchParams }: InvoicesContentProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<Id<"tasks_v2">>>(new Set());
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  
  const { isAuthenticated, isLoading: isConvexLoading } = useConvexAuth();
  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();
  
  // Add explicit loading state tracking
  const isAuthLoading = isConvexLoading || !isClerkLoaded;
  const shouldFetchData = isAuthenticated && isSignedIn && !isAuthLoading;
  
  const deleteInvoice = useMutation(api.invoices.deleteInvoice);
  
  // Fetch data with proper loading states
  const invoicesQuery = useQuery(
    api.invoices.getAllInvoices,
    shouldFetchData ? { paginationOpts: { numToSkip: 0, numToTake: 100 } } : "skip"
  );

  const tasksQuery = useQuery(
    api.tasks.getRecentTasks,
    shouldFetchData ? {} : "skip"
  );

  const clientsQuery = useQuery(
    api.clients.getAll,
    shouldFetchData ? { paginationOpts: { numToSkip: 0, numToTake: 100 } } : "skip"
  );

  // Update loading check to handle null values
  const isInvoicesLoading = shouldFetchData && (invoicesQuery === undefined || invoicesQuery === null);
  const isTasksLoading = shouldFetchData && tasksQuery === undefined;
  const isClientsLoading = shouldFetchData && (clientsQuery === undefined || clientsQuery === null);

  // Only block on invoices loading
  const isLoading = isInvoicesLoading || isAuthLoading;

  // Validate and transform query responses with stricter checks
  const invoices = (
    invoicesQuery && 
    Array.isArray(invoicesQuery) && 
    invoicesQuery.length >= 0
  ) ? invoicesQuery : [];
  const tasks = Array.isArray(tasksQuery) ? tasksQuery : [];
  const clients = (
    clientsQuery && 
    clientsQuery.clients && 
    Array.isArray(clientsQuery.clients)
  ) ? clientsQuery : { clients: [], totalCount: 0 };

  // Update empty state to handle null responses
  const isDataEmpty = !isLoading && invoices.length === 0 && invoicesQuery !== null;

  // Add more detailed query state tracking
  useEffect(() => {
    console.log('Invoice Query State:', {
      auth: {
        isAuthenticated,
        isSignedIn,
        isAuthLoading,
        shouldFetchData
      },
      queries: {
        invoices: {
          value: invoicesQuery,
          type: typeof invoicesQuery,
          isArray: Array.isArray(invoicesQuery),
          isNull: invoicesQuery === null,
          isUndefined: invoicesQuery === undefined,
          length: Array.isArray(invoicesQuery) ? invoicesQuery.length : null
        },
        tasks: {
          value: tasksQuery,
          isArray: Array.isArray(tasksQuery),
          length: Array.isArray(tasksQuery) ? tasksQuery.length : null
        },
        clients: {
          value: clientsQuery,
          hasClients: Boolean(clientsQuery?.clients),
          isArray: Array.isArray(clientsQuery?.clients),
          length: Array.isArray(clientsQuery?.clients) ? clientsQuery.clients.length : null
        }
      },
      state: {
        isLoading,
        isInvoicesLoading,
        isDataEmpty,
        invoicesLength: invoices.length,
        canShowEmpty: !isLoading && invoices.length === 0 && invoicesQuery !== null
      }
    });
  }, [
    isAuthenticated,
    isSignedIn,
    isAuthLoading,
    shouldFetchData,
    invoicesQuery,
    tasksQuery,
    clientsQuery,
    isLoading,
    isInvoicesLoading,
    isDataEmpty,
    invoices.length
  ]);

  // Debug logging
  useEffect(() => {
    console.log('Data Fetching Debug State:', {
      authState: {
        isAuthenticated,
        isSignedIn,
        isConvexLoading,
        isClerkLoaded,
        isAuthLoading,
        shouldFetchData
      },
      dataState: {
        invoices: {
          isLoading: invoicesQuery === undefined,
          data: invoicesQuery,
          length: Array.isArray(invoicesQuery) ? invoicesQuery.length : null
        },
        tasks: {
          isLoading: tasksQuery === undefined,
          data: tasksQuery,
          length: Array.isArray(tasksQuery) ? tasksQuery.length : null
        },
        clients: {
          isLoading: clientsQuery === undefined,
          data: clientsQuery,
          totalCount: clientsQuery?.totalCount
        }
      }
    });
  }, [invoicesQuery, tasksQuery, clientsQuery, isAuthenticated, isSignedIn, isConvexLoading, isClerkLoaded, isAuthLoading, shouldFetchData]);

  // Show loading state with more detailed messages
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-gray-600 dark:text-gray-400">
          {isAuthLoading ? "Checking authentication..." : "Loading invoices..."}
        </p>
        {isInvoicesLoading && (
          <p className="text-sm text-gray-500">
            {invoicesQuery === null 
              ? "Initializing invoice data..."
              : "Fetching your invoice data..."}
          </p>
        )}
      </div>
    );
  }

  // Show auth error if not authenticated
  if (!isAuthenticated || !isSignedIn) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4">
        <p className="text-red-500">Please sign in to view invoices.</p>
        <Button onClick={() => window.location.href = '/sign-in'}>
          Sign In
        </Button>
      </div>
    );
  }

  // Handle case where queries were skipped
  if (!shouldFetchData) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4">
        <p className="text-red-500">Unable to fetch data. Please try refreshing the page.</p>
        <Button onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </div>
    );
  }

  // Update empty state render to handle background loading
  if (isDataEmpty) {
    console.log('Rendering empty state');
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Invoices</h1>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            disabled={isTasksLoading || isClientsLoading || tasks.length === 0 || clients.clients.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
            {(isTasksLoading || isClientsLoading) ? (
              <span className="ml-2 text-xs">(Loading data...)</span>
            ) : (tasks.length === 0 || clients.clients.length === 0) && (
              <span className="ml-2 text-xs">
                (Need {tasks.length === 0 ? 'tasks' : 'clients'} first)
              </span>
            )}
          </Button>
        </div>
        <EmptyState />
      </div>
    );
  }

  console.log('Rendering invoice list with', invoices.length, 'invoices');
  return (
    <div className="space-y-4">
      <AuthDebugger />
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          disabled={!tasks || !clients.clients}
        >
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

      {tasks && clients.clients && (
        <>
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
        </>
      )}
    </div>
  );
} 