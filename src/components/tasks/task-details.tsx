"use client";

import { formatCurrency } from "@/lib/utils";
import { Task } from "@/types";

interface TaskDetailsProps {
  task: Task;
}

export function TaskDetails({ task }: TaskDetailsProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {task.client}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {new Date(task.date).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              task.status === "completed"
                ? "bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-400"
                : task.status === "pending"
                ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {task.status}
          </span>
        </div>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p>{task.description}</p>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Hours
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white tabular-nums">
              {task.hours.toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Rate
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white tabular-nums">
              {task.hourlyRate ? formatCurrency(task.hourlyRate) : "-"}/hour
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Amount
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">
              {task.amount ? formatCurrency(task.amount) : "-"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
} 