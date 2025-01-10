"use client";

import { Id } from "convex/_generated/dataModel";
import { formatCurrency } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Task } from "@/types";

interface TaskListProps {
  tasks: Task[];
  selectedIds: Id<"tasks">[];
  onSelect: (taskId: Id<"tasks">) => void;
}

export function TaskList({ tasks, selectedIds, onSelect }: TaskListProps) {
  if (!tasks.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No tasks available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div
          key={task._id}
          className="flex items-center space-x-4 p-4 border rounded-lg"
        >
          <Checkbox
            checked={selectedIds.includes(task._id)}
            onCheckedChange={() => onSelect(task._id)}
          />
          <div className="flex-1">
            <p className="font-medium">{task.description}</p>
            <p className="text-sm text-gray-500">
              {task.hours} hours at {formatCurrency(task.hourlyRate ?? 0)}/hr
            </p>
            <p className="text-sm text-gray-500">Date: {task.date}</p>
          </div>
          <div className="text-right">
            <p className="font-medium">{formatCurrency(task.amount ?? 0)}</p>
          </div>
        </div>
      ))}
    </div>
  );
} 