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
  const updateTask = useMutation(api.tasks.update);
  const [description, setDescription] = useState(task.description || "");
  const [hours, setHours] = useState(task.hours.toString());
  const [date, setDate] = useState(task.date || new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<"pending" | "completed">(task.status || "pending");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !hours) return;

    setIsSubmitting(true);
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
      console.error("Failed to update task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Task description"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Hours</label>
        <Input
          type="number"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          min="0"
          step="0.01"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Date</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <Select value={status} onValueChange={(value) => setStatus(value as "pending" | "completed")}>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Task"
          )}
        </Button>
      </div>
    </form>
  );
} 