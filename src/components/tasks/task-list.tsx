"use client";

import { Id } from "@/convex/_generated/dataModel";
import { formatCurrency } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface Task {
  _id: Id<"tasks">;
  description: string;
  hours: number;
  date: string;
  amount: number;
  hourlyRate: number;
}

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
          className="flex items-center space-x-4 rounded-lg border p-4"
        >
          <Checkbox
            checked={selectedIds.includes(task._id)}
            onCheckedChange={() => onSelect(task._id)}
          />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">
              {task.description}
            </p>
            <p className="text-sm text-muted-foreground">
              {new Date(task.date).toLocaleDateString()} · {task.hours} hours · {formatCurrency(task.hourlyRate)}/hr
            </p>
          </div>
          <div className="text-sm font-medium">
            {formatCurrency(task.amount)}
          </div>
        </div>
      ))}
    </div>
  );
} 