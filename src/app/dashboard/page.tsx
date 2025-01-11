"use client";

// Testing Convex deployment - this comment is to trigger a new build
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";
import { TaskModal } from "@/components/tasks/task-modal";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import { DollarSign, Clock, Users, ListTodo, Calendar } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function DashboardPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const createUser = useMutation(api.users.create);
  const existingUser = useQuery(api.users.get);
  const tasks = useQuery(api.tasks.getRecentTasks) || [];
  const stats = useQuery(api.tasks.getDashboardStats);
  const clientsResponse = useQuery(api.clients.getAll, {
    paginationOpts: { numToSkip: 0, numToTake: 1000 },
  });
  const clients = clientsResponse?.clients ?? [];
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<Id<"tasks">>>(new Set());

  // Filter out tasks that have already been invoiced
  const unbilledTasks = tasks.filter(task => !task.invoiced);

  const getClientName = (task: any) => {
    if (task.clientId) {
      return clients.find(client => client._id === task.clientId)?.name || 'Unknown Client';
    }
    return task.client || 'Unknown Client';
  };

  useEffect(() => {
    const initUser = async () => {
      if (isSignedIn && user && !existingUser) {
        try {
          await createUser({
            name: user.fullName || "",
            email: user.primaryEmailAddress?.emailAddress || "",
            businessName: "My Business",
            paymentInstructions: "Please include the invoice number in your payment reference.",
          });
        } catch (error) {
          console.error("Error creating user:", error);
        }
      }
    };

    initUser();
  }, [isSignedIn, user, existingUser, createUser]);

  const handleTaskSelection = (taskId: Id<"tasks">) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleCreateInvoice = () => {
    if (selectedTasks.size === 0) return;
    sessionStorage.setItem('selectedTasksForInvoice', JSON.stringify(Array.from(selectedTasks)));
    router.push('/dashboard/invoices/new');
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}! Here's an overview of your freelance business.
          </p>
        </div>
        <Button
          onClick={() => setIsNewTaskModalOpen(true)}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <ListTodo className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Unbilled Amount"
          value={formatCurrency(stats?.unbilledAmount || 0)}
          description="Total amount from unbilled tasks"
          icon={<DollarSign className="w-5 h-5 text-green-500" />}
        />
        <StatCard
          title="Unbilled Hours"
          value={`${(stats?.unbilledHours || 0).toFixed(1)}h`}
          description="Total hours from unbilled tasks"
          icon={<Clock className="w-5 h-5 text-blue-500" />}
        />
        <StatCard
          title="Active Clients"
          value={stats?.activeClients || 0}
          description="Clients with unbilled tasks"
          icon={<Users className="w-5 h-5 text-purple-500" />}
        />
        <StatCard
          title="Recent Tasks"
          value={stats?.recentTasksCount || 0}
          description="Tasks created in the last 30 days"
          icon={<ListTodo className="w-5 h-5 text-orange-500" />}
        />
      </div>

      {/* Unbilled Tasks Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <ListTodo className="w-5 h-5 mr-2 text-blue-500" />
              Unbilled Tasks
            </h2>
            {selectedTasks.size > 0 && (
              <Button
                onClick={handleCreateInvoice}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create Invoice ({selectedTasks.size} tasks)
              </Button>
            )}
          </div>
          <div className="mt-6 flow-root">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {unbilledTasks.map((task) => (
                <li key={task._id} className="py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      checked={selectedTasks.has(task._id)}
                      onCheckedChange={() => handleTaskSelection(task._id)}
                      className="ml-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {task.description}
                        </p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {getClientName(task)}
                        </span>
                      </div>
                      <div className="flex items-center mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(task.date).toLocaleDateString()} • {task.hours}h
                      </div>
                    </div>
                    <div className="inline-flex items-center text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(task.amount || (task.hours * (clients.find(c => c._id === task.clientId)?.hourlyRate || 0)))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {unbilledTasks.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <ListTodo className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No unbilled tasks found</p>
                <p className="mt-1">Create a new task to get started!</p>
              </div>
            )}
          </div>
          {unbilledTasks.length > 0 && (
            <div className="mt-6">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/tasks')}
                className="w-full"
              >
                View All Tasks
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar for Selected Tasks */}
      {selectedTasks.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 pb-2 sm:pb-5">
          <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
            <div className="rounded-lg bg-blue-600 p-2 shadow-lg sm:p-3">
              <div className="flex flex-wrap items-center justify-between">
                <div className="flex w-0 flex-1 items-center">
                  <span className="flex rounded-lg bg-blue-800 p-2">
                    <ListTodo className="h-6 w-6 text-white" />
                  </span>
                  <p className="ml-3 truncate font-medium text-white">
                    <span className="md:hidden">{selectedTasks.size} tasks selected</span>
                    <span className="hidden md:inline">{selectedTasks.size} tasks selected for invoice</span>
                  </p>
                </div>
                <div className="order-3 mt-2 w-full flex-shrink-0 sm:order-2 sm:mt-0 sm:w-auto">
                  <Button
                    onClick={handleCreateInvoice}
                    variant="secondary"
                    className="flex items-center justify-center w-full"
                  >
                    Create Invoice
                  </Button>
                </div>
                <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-2">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedTasks(new Set())}
                    className="-mr-1 flex p-2 hover:bg-blue-500 focus:ring-white"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
      />
    </div>
  );
}

function StatCard({ title, value, description, icon }: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
          {icon}
        </div>
        <div className="flex-1">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
            {title}
          </dt>
          <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
            {value}
          </dd>
          <dd className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </dd>
        </div>
      </div>
    </div>
  );
} 