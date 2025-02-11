"use client";

import { Task } from "@/types";
import { formatCurrency } from "@/lib/client-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditTaskForm } from "./edit-task-form";
import { useState } from "react";

interface TaskModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskModal({ task, isOpen, onClose }: TaskModalProps) {
  const [isEditing, setIsEditing] = useState(false);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return new Date().toLocaleDateString();
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>
            View and manage task information
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <EditTaskForm task={task} onClose={() => setIsEditing(false)} />
        ) : (
          <div className="mt-4">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {task.description}
                    </h3>
                    <Badge
                      variant={task.status === "completed" ? "success" : "secondary"}
                      className="mt-2"
                    >
                      {task.status}
                    </Badge>
                  </div>
                </div>

                <dl className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                      Date
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {formatDate(task.date)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                      Hours
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {task.hours}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                      Rate
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {formatCurrency(task.hourlyRate ?? 0)}/hr
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                      Amount
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {formatCurrency(task.amount ?? 0)}
                    </p>
                  </div>
                </dl>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  Edit Task
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 