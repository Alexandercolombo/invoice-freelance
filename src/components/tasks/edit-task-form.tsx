"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface EditTaskFormProps {
  task: Task;
  onClose: () => void;
}

export function EditTaskForm({ task, onClose }: EditTaskFormProps) {
  const [description, setDescription] = useState(task.description);
  const [hours, setHours] = useState(task.hours.toString());
  const [date, setDate] = useState(task.date);
  const [status, setStatus] = useState<"pending" | "completed">(task.status);
  const [isLoading, setIsLoading] = useState(false);

  const updateTask = useMutation(api.tasks.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateTask({
        id: task._id,
        description,
        hours: parseFloat(hours),
        date,
        status,
      });
      onClose();
    } catch (error) {
      console.error("Error updating task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
          Description
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            Hours
          </label>
          <Input
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            step="0.1"
            min="0"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
            Date
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
          Status
        </label>
        <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
} 