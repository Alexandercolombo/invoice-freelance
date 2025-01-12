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
import { Loader2, Plus } from "lucide-react";
import { Task, Client } from "@/types";
import { DashboardStats } from "@/components/dashboard/stats";

export default function DashboardPage() {
  const router = useRouter();
  const [selectedTasks, setSelectedTasks] = useState<Set<Id<"tasks_v2">>>(new Set());
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

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

  const handleCreateInvoice = () => {
    setIsCreatingInvoice(true);
    const taskIds = Array.from(selectedTasks).join(",");
    router.push(`/dashboard/invoices/new?tasks=${taskIds}`);
  };

  if (!tasks || !clients.clients) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <DashboardStats />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 bg-gray-200 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => router.push('/dashboard/tasks/new')}
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
          <Button
            onClick={handleCreateInvoice}
            disabled={selectedTasks.size === 0 || isCreatingInvoice}
          >
            {isCreatingInvoice ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Invoice"
            )}
          </Button>
        </div>
      </div>

      <DashboardStats />

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Unbilled Tasks</h2>
          {tasks.length > 0 && (
            <p className="text-sm text-gray-500">
              Select tasks to create an invoice
            </p>
          )}
        </div>
        {tasks.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-1">No unbilled tasks</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first task</p>
              <Button
                onClick={() => router.push('/dashboard/tasks/new')}
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task: Task) => {
              const client = clients.clients.find((c: Client) => c._id === task.clientId);
              if (!client || !task.description || !task.hours || !client.name || !client.hourlyRate) return null;

              const amount = task.hours * client.hourlyRate;

              return (
                <Card key={task._id} className="p-4">
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      checked={selectedTasks.has(task._id)}
                      onCheckedChange={() => handleTaskSelection(task._id)}
                      className="ml-1"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{task.description}</p>
                          <p className="text-sm text-gray-500">
                            {client.name} • {task.hours} hours
                          </p>
                        </div>
                        <p className="font-medium">
                          {formatCurrency(amount)}
                        </p>
                      </div>
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            task.status === "completed"
                              ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                              : "bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20"
                          }`}
                        >
                          {task.status || "pending"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 