'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { formatCurrency } from '@/lib/utils';
import { Id } from '../../../../../convex/_generated/dataModel';
import { useRetryMutation } from '@/hooks/use-retry-mutation';
import { Loader2 } from 'lucide-react';

type TasksByClient = {
  [K in Id<"clients">]: Array<{
    _id: Id<"tasks">;
    description: string;
    hours: number;
    date: string;
    amount: number;
    hourlyRate: number;
  }>;
};

export default function NewInvoicePage() {
  const router = useRouter();
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<TasksByClient>({} as TasksByClient);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  
  const tasks = useQuery(api.tasks.getTasksByIds, { ids: selectedTaskIds as any[] });
  const clientsData = useQuery(api.clients.getAll, {});
  const clients = clientsData?.clients || [];
  const { execute: createInvoice, isRetrying, attempt } = useRetryMutation(api.invoices.createInvoice, {
    maxRetries: 3,
    initialDelay: 1000,
  });

  useEffect(() => {
    // Retrieve selected task IDs from sessionStorage
    const storedTaskIds = sessionStorage.getItem('selectedTasksForInvoice');
    if (!storedTaskIds) {
      router.push('/dashboard');
      return;
    }
    setSelectedTaskIds(JSON.parse(storedTaskIds));
  }, [router]);

  useEffect(() => {
    if (tasks && clientsData?.clients) {
      // Group tasks by client
      const grouped = tasks.reduce((acc, task) => {
        if (!task.clientId) return acc;
        if (!acc[task.clientId]) {
          acc[task.clientId] = [];
        }
        acc[task.clientId].push(task);
        return acc;
      }, {} as TasksByClient);
      
      setSelectedTasks(grouped);
      setIsLoading(false);
    }
  }, [tasks, clientsData?.clients]);

  // Validate data and check for potential issues
  const validateInvoiceData = () => {
    const newWarnings: string[] = [];
    
    // Check if we have all necessary data
    if (!tasks || tasks.length === 0) {
      throw new Error("No tasks selected for invoice creation");
    }

    if (!clients || clients.length === 0) {
      throw new Error("Unable to fetch client data. Please try again.");
    }

    // Check for tasks without client data
    const tasksWithoutClient = tasks.filter(task => !task.clientId);
    if (tasksWithoutClient.length > 0) {
      newWarnings.push(`${tasksWithoutClient.length} task(s) have missing client information`);
    }

    // Check for tasks with changed hourly rates
    const tasksWithRateChanges = tasks.filter(task => {
      const client = clients.find(c => c._id === task.clientId);
      return client && client.hourlyRate !== task.hourlyRate;
    });
    if (tasksWithRateChanges.length > 0) {
      newWarnings.push(`${tasksWithRateChanges.length} task(s) have different rates than current client rates`);
    }

    // Check for already invoiced tasks
    const invoicedTasks = tasks.filter(task => task.invoiced);
    if (invoicedTasks.length > 0) {
      throw new Error(`${invoicedTasks.length} task(s) have already been invoiced. Please refresh and try again.`);
    }

    setWarnings(newWarnings);
  };

  const handleCreateInvoice = async () => {
    setIsLoading(true);
    setError(null);
    setWarnings([]);

    try {
      // Validate data before proceeding
      validateInvoiceData();

      // Create an invoice for each client
      for (const [clientId, clientTasks] of Object.entries(selectedTasks)) {
        const client = clients.find(c => c._id === clientId);
        if (!client) {
          throw new Error(`Client data missing for some tasks. Please refresh and try again.`);
        }

        try {
          const subtotal = clientTasks.reduce((sum, task) => sum + task.amount, 0);
          const tax = 0;
          const total = subtotal + tax;

          await createInvoice({
            clientId: clientId as Id<"clients">,
            taskIds: clientTasks.map(task => task._id),
            date: new Date().toISOString(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            tax,
            notes: "",
          });
        } catch (err) {
          throw new Error(`Failed to create invoice for client ${client.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Clear selected tasks and redirect
      sessionStorage.removeItem('selectedTasksForInvoice');
      router.push('/dashboard/invoices');
    } catch (error) {
      console.error('Failed to create invoice:', error);
      setError(error instanceof Error ? error.message : 'Failed to create invoice. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while fetching initial data
  if (!tasks || !clientsData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
      </div>
    );
  }

  const totalTasks = tasks?.length || 0;
  const totalHours = tasks?.reduce((sum, task) => sum + task.hours, 0) || 0;
  const totalAmount = tasks?.reduce((sum, task) => sum + task.amount, 0) || 0;

  return (
    <div className="py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
              New Invoice
            </h2>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center rounded-md bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateInvoice}
              disabled={isLoading || isRetrying}
              className="ml-3 inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading || isRetrying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isRetrying ? `Retrying (${attempt}/3)...` : 'Creating...'}
                </>
              ) : (
                'Create Invoice'
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{error}</p>
                  {isRetrying && (
                    <p className="mt-1">
                      Attempting to retry the operation automatically...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mt-4 rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warning</h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <ul className="list-disc list-inside">
                    {warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Section */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Total Tasks</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">{totalTasks}</dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Total Hours</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">{totalHours.toFixed(2)}</dd>
          </div>
          <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 py-5 shadow sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Total Amount</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</dd>
          </div>
        </div>

        {/* Tasks by Client */}
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              {Object.entries(selectedTasks).map(([clientId, clientTasks]) => {
                const client = clients.find(c => c._id === clientId);
                const clientTotal = clientTasks.reduce((sum, task) => sum + task.amount, 0);
                const clientHours = clientTasks.reduce((sum, task) => sum + task.hours, 0);

                return (
                  <div key={clientId} className="mb-8 overflow-hidden bg-white dark:bg-gray-800 shadow sm:rounded-lg">
                    <div className="px-4 py-5 sm:px-6">
                      <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                        {client?.name || 'Unknown Client'}
                      </h3>
                      <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                        {clientTasks.length} tasks · {clientHours.toFixed(2)} hours · {formatCurrency(clientTotal)}
                      </p>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                        <thead>
                          <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">
                              Date
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                              Description
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white">
                              Hours
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white">
                              Rate
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {clientTasks.map((task) => (
                            <tr key={task._id}>
                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 dark:text-white sm:pl-6">
                                {new Date(task.date).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                {task.description}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-right">
                                {task.hours.toFixed(2)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-right">
                                {formatCurrency(task.hourlyRate)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 dark:text-white text-right">
                                {formatCurrency(task.amount)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50 dark:bg-gray-800/50">
                            <td colSpan={3} className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                              Client Total
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-right">
                              {clientHours.toFixed(2)} hrs
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 dark:text-white text-right">
                              {formatCurrency(clientTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 