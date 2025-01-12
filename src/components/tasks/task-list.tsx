"use client";

import { useState } from "react";
import { Id } from "convex/_generated/dataModel";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Task } from "@/types";
import { TaskModal } from "./task-modal";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";

interface TaskListProps {
  tasks: Task[];
  selectedIds: Id<"tasks_v2">[];
  onSelect: (taskId: Id<"tasks_v2">) => void;
}

export function TaskList({ tasks, selectedIds, onSelect }: TaskListProps) {
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const deleteTask = useMutation(api.tasks.deleteTask);

  if (!tasks.length) {
    return <p className="text-center text-gray-500">No tasks available</p>;
  }

  const handleDelete = async (taskId: Id<"tasks_v2">) => {
    try {
      await deleteTask({ id: taskId });
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div key={task._id} className="flex items-center justify-between p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              checked={selectedIds.includes(task._id)}
              onChange={() => onSelect(task._id)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <div>
              <p className="font-medium">{task.description}</p>
              <p className="text-sm text-gray-500">
                {task.hours} hours • {formatCurrency(task.amount ?? 0)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              onClick={() => handleDelete(task._id)}
            >
              Delete
            </Button>
          </div>
        </div>
      ))}

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