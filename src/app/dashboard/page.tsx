"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";
import { Plus, Receipt, ArrowRight } from "lucide-react";
import { Task, Client } from "@/types";
import { DashboardStats } from "@/components/dashboard/stats";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import { CreateInvoiceModal } from "@/components/invoices/create-invoice-modal";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardPage() {
  const router = useRouter();
  const [selectedTasks, setSelectedTasks] = useState<Set<Id<"tasks_v2">>>(new Set());
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  const tasks = useQuery(api.tasks.getRecentTasks) || [];
  const clients = useQuery(api.clients.getAll, {
    paginationOpts: { numToSkip: 0, numToTake: 100 }
  }) || { clients: [], totalCount: 0 };

  const handleTaskSelection = (taskId: Id<"tasks_v2">) => {
    const newSelectedTasks = new Set(selectedTasks);
    if (newSelectedTasks.has(taskId)) {
      newSelectedTasks.delete(taskId);
    } else {
      newSelectedTasks.add(taskId);
    }
    setSelectedTasks(newSelectedTasks);
  };

  const selectedTasksTotal = tasks
    .filter(task => selectedTasks.has(task._id))
    .reduce((sum, task) => {
      const client = clients.clients.find(c => c._id === task.clientId);
      return sum + (task.hours * (client?.hourlyRate || 0));
    }, 0);

  if (!tasks || !clients.clients) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center animate-in fade-in duration-500">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
        <DashboardStats />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-col space-y-1 animate-in fade-in slide-in-from-left-4 duration-500">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Track your tasks and manage invoices
          </p>
        </div>
        
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <Button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="group"
          >
            <Plus className="w-4 h-4 mr-2 transition-transform group-hover:scale-110 group-hover:rotate-90" />
            New Task
          </Button>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
        <DashboardStats />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Unbilled Tasks</h2>
          {tasks.length > 0 && selectedTasks.size === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
              Select tasks to create an invoice
            </p>
          )}
        </div>
        {tasks.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No unbilled tasks</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Get started by creating your first task</p>
              <Button
                onClick={() => setIsNewTaskModalOpen(true)}
                size="lg"
                className="group"
              >
                <Plus className="w-4 h-4 mr-2 transition-transform group-hover:scale-110 group-hover:rotate-90" />
                New Task
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tasks.map((task: Task, index: number) => {
                const client = clients.clients.find((c: Client) => c._id === task.clientId);
                if (!client || !task.description || !task.hours || !client.name || !client.hourlyRate) return null;

                const amount = task.hours * client.hourlyRate;
                const isSelected = selectedTasks.has(task._id);

                return (
                  <div
                    key={task._id}
                    className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Card 
                      className={`group p-6 transition-all duration-300 hover:shadow-lg ${
                        isSelected ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleTaskSelection(task._id)}
                            className={`transition-transform duration-200 ${
                              isSelected ? 'scale-110' : 'group-hover:scale-110'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <div className="pr-4">
                              <p className="font-medium truncate hover:text-primary transition-colors">
                                {task.description}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {client.name} • {task.hours} hours
                              </p>
                            </div>
                            <p className="font-medium text-right">
                              {formatCurrency(amount)}
                            </p>
                          </div>
                          <div className="mt-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                                task.status === "completed"
                                  ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20"
                                  : "bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20 dark:bg-yellow-500/10 dark:text-yellow-400 dark:ring-yellow-500/20"
                              }`}
                            >
                              {task.status || "pending"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>

            <AnimatePresence>
              {selectedTasks.size > 0 && (
                <div
                  className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-8 duration-500"
                >
                  <Card className="p-6 shadow-2xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground backdrop-blur-sm">
                    <div className="flex items-center space-x-8">
                      <div>
                        <p className="text-sm font-medium opacity-90">Selected Tasks</p>
                        <p className="text-2xl font-bold">{formatCurrency(selectedTasksTotal)}</p>
                      </div>
                      <Button
                        onClick={() => setIsCreatingInvoice(true)}
                        variant="secondary"
                        className="group"
                      >
                        <Receipt className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
                        Create Invoice
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
      />

      <CreateInvoiceModal
        isOpen={isCreatingInvoice}
        onClose={() => setIsCreatingInvoice(false)}
        selectedTasks={selectedTasks}
        tasks={tasks}
        clients={clients.clients}
      />
    </div>
  );
} 