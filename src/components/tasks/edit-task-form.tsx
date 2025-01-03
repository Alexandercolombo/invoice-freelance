"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { formatCurrency } from "@/lib/utils";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

interface EditTaskFormProps {
  task: {
    _id: Id<"tasks">;
    client: string;
    description: string;
    date: string;
    hours: number;
    status: 'completed' | 'in-progress' | 'pending';
    hourlyRate: number;
  };
  onClose: () => void;
}

export function EditTaskForm({ task, onClose }: EditTaskFormProps) {
  const [formData, setFormData] = useState({
    description: task.description,
    hours: task.hours.toString(),
    date: task.date,
    status: task.status as "pending" | "in-progress" | "completed",
  });
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(task.hourlyRate);
  const [tempRate, setTempRate] = useState(task.hourlyRate.toString());

  // Calculate amount in real-time
  const amount = parseFloat(formData.hours) * hourlyRate;
  const isValidHours = !isNaN(parseFloat(formData.hours)) && parseFloat(formData.hours) >= 0;
  const isValidRate = !isNaN(parseFloat(tempRate)) && parseFloat(tempRate) >= 0;

  const updateTask = useMutation(api.tasks.update);
  const updateClient = useMutation(api.clients.updateClient);
  const clients = useQuery(api.clients.getAll);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hoursValue = parseFloat(formData.hours);
    if (isNaN(hoursValue) || hoursValue <= 0) {
      alert("Please enter a valid number of hours");
      return;
    }

    try {
      // If rate was changed, update the client first
      if (hourlyRate !== task.hourlyRate) {
        const client = clients?.find(c => c.name === task.client);
        if (client) {
          await updateClient({
            id: client._id,
            name: client.name,
            email: client.email,
            address: client.address,
            hourlyRate: hourlyRate,
          });
        }
      }

      await updateTask({
        id: task._id,
        client: task.client,
        description: formData.description,
        hours: hoursValue,
        date: formData.date,
        status: formData.status,
      });
      onClose();
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRateSubmit = () => {
    if (isValidRate) {
      setHourlyRate(parseFloat(tempRate));
      setIsEditingRate(false);
    }
  };

  const handleRateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRateSubmit();
    } else if (e.key === 'Escape') {
      setTempRate(hourlyRate.toString());
      setIsEditingRate(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client Info */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Client
            </h3>
            <p className="mt-1 text-lg font-medium text-gray-900 dark:text-white">
              {task.client}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Rate
            </h3>
            <div className="mt-1 flex items-center gap-2">
              {isEditingRate ? (
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    value={tempRate}
                    onChange={(e) => setTempRate(e.target.value)}
                    onBlur={handleRateSubmit}
                    onKeyDown={handleRateKeyDown}
                    className="block w-full rounded-lg border-gray-300 dark:border-gray-600 pl-7 pr-12 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    autoFocus
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 sm:text-sm">/hr</span>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatCurrency(hourlyRate)}/hr
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsEditingRate(true)}
                    className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                    title="Edit Rate"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
          required
        />
      </div>

      {/* Hours and Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="hours" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Hours
          </label>
          <div className="mt-1 relative rounded-lg shadow-sm">
            <input
              type="text"
              inputMode="decimal"
              id="hours"
              value={formData.hours}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setFormData(prev => ({ ...prev, hours: value }));
                }
              }}
              className="block w-full rounded-lg pr-12 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
              required
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-500 dark:text-gray-400 sm:text-sm">hrs</span>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Date
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
            required
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Status
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
        >
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Total Amount */}
      <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Total Amount
          </h3>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {isValidHours ? formatCurrency(amount) : '—'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isValidHours || !isValidRate}
          className="rounded-lg bg-gray-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-gray-900 shadow-sm hover:bg-gray-800 dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Update Task
        </button>
      </div>
    </form>
  );
} 