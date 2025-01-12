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
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Tasks</h1>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid gap-4">
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <Button onClick={() => setIsCreating(true)}>
          Create Task
        </Button>
      </div>

      <div className="grid gap-4">
        {tasks.map((task) => {
          const client = clients.clients.find((c) => c._id === task.clientId);
          if (!client || !task.description || !task.hours || !client.name || !client.hourlyRate) return null;

          const amount = task.hours * client.hourlyRate;

          return editingId === task._id ? (
            <Card key={task._id} className="p-4">
              <EditTaskForm
                task={{
                  ...task,
                  date: task.date || new Date().toISOString().split('T')[0]
                }}
                onClose={() => setEditingId(null)}
              />
            </Card>
          ) : (
            <Card key={task._id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{task.description}</p>
                  <p className="text-sm text-gray-500">
                    {client.name} • {task.hours} hours
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <p className="font-medium">
                    {formatCurrency(amount)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewingTask(task)}
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
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(task._id)}
                  >
                    Delete
                  </Button>
                </div>
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
  );
} 