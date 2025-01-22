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
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import { EditTaskForm } from "@/components/tasks/edit-task-form";
import { TaskModal } from "@/components/tasks/task-modal";
import { Task, Client } from "@/types";
import { motion } from "framer-motion";

interface FormData {
  description: string;
  hours: number;
  date: string;
  status: "pending" | "completed";
}

export default function TasksPage() {
  const router = useRouter();
  const [selectedTasks, setSelectedTasks] = useState<Set<Id<"tasks_v2">>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<Id<"tasks_v2"> | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<FormData>({
    description: "",
    hours: 0,
    date: new Date().toISOString().split("T")[0],
    status: "pending" as const,
  });

  const tasks = useQuery(api.tasks.list) || [];
  const clients = useQuery(api.clients.getAll, { 
    paginationOpts: { numToSkip: 0, numToTake: 100 } 
  }) || { clients: [], totalCount: 0 };
  const [selectedClient, setSelectedClient] = useState<Id<"clients"> | null>(null);
  const updateTask = useMutation(api.tasks.update);
  const createTask = useMutation(api.tasks.create);
  const deleteTask = useMutation(api.tasks.deleteTask);

  const handleDelete = async (taskId: Id<"tasks_v2">) => {
    try {
      await deleteTask({ id: taskId });
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    const client = clients.clients.find((c: Client) => c._id === selectedClient);
    if (!client) return;

    try {
      if (editingId) {
        await updateTask({
          id: editingId as Id<"tasks_v2">,
          description: formData.description,
          hours: formData.hours,
          date: formData.date,
          status: formData.status,
        });
      } else {
        await createTask({
          description: formData.description,
          hours: formData.hours,
          date: formData.date,
          clientId: selectedClient,
          hourlyRate: client.hourlyRate,
          status: formData.status,
        });
      }

      setFormData({
        description: "",
        hours: 0,
        date: new Date().toISOString().split("T")[0],
        status: "pending" as const,
      });
      setEditingId(null);
      setIsCreating(false);
    } catch (error) {
      console.error("Error submitting task:", error);
    }
  };

  if (!tasks || !clients.clients) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tasks</h1>
                <p className="text-base text-gray-600 dark:text-gray-400">
                  Track and manage your tasks for each client.
                </p>
              </div>
              <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tasks</h1>
              <p className="text-base text-gray-600 dark:text-gray-400">
                Track and manage your tasks for each client.
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => setIsCreating(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                Create Task
              </Button>
            </motion.div>
          </div>

          <div className="grid gap-4">
            {tasks.map((task) => {
              const client = clients.clients.find((c) => c._id === task.clientId);
              if (!client || !task.description || !task.hours || !client.name || !client.hourlyRate) return null;

              const amount = task.hours * client.hourlyRate;

              return editingId === task._id ? (
                <Card key={task._id} className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <EditTaskForm
                    task={{
                      ...task,
                      date: task.date || new Date().toISOString().split('T')[0]
                    }}
                    onClose={() => setEditingId(null)}
                  />
                </Card>
              ) : (
                <Card key={task._id} className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{task.description}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {client.name} • {task.hours} hours
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(amount)}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingTask(task)}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormData({
                            description: task.description || "",
                            hours: task.hours,
                            date: task.date || new Date().toISOString().split("T")[0],
                            status: task.status || "pending",
                          });
                          setEditingId(task._id);
                        }}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(task._id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        task.status === "completed"
                          ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/30"
                          : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 ring-1 ring-inset ring-yellow-600/20 dark:ring-yellow-500/30"
                      }`}
                    >
                      {task.status || "pending"}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>

          {isCreating && (
            <NewTaskModal
              isOpen={isCreating}
              onClose={() => setIsCreating(false)}
            />
          )}

          {viewingTask && (
            <TaskModal
              task={viewingTask}
              isOpen={!!viewingTask}
              onClose={() => setViewingTask(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
} 