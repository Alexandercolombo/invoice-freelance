"use client";

import { formatCurrency } from "@/lib/client-utils";
import { Task } from "@/types";

interface TaskDetailsProps {
  task: Task;
}

export function TaskDetails({ task }: TaskDetailsProps) {
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return new Date().toLocaleDateString();
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {task.description}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {formatDate(task.date)}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            task.status === "completed"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {task.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Hours</p>
          <p className="mt-1 text-lg font-medium text-gray-900 dark:text-white">{task.hours}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Amount</p>
          <p className="mt-1 text-lg font-medium text-gray-900 dark:text-white">
            {formatCurrency(task.amount ?? 0)}
          </p>
        </div>
      </div>
    </div>
  );
} 