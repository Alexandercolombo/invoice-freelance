"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatCurrency } from "@/lib/utils";
import { Id } from "../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, DollarSign, ExternalLink } from "lucide-react";
import Link from "next/link";

type TaskFormData = {
  description: string;
  date: string;
  hours: number;
  clientId: Id<"clients"> | null;
  status: "pending" | "in-progress" | "completed";
};

const defaultFormData: TaskFormData = {
  description: "",
  date: new Date().toISOString().split('T')[0],
  hours: 0,
  clientId: null,
  status: "pending",
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  "in-progress": "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  invoiced: "bg-purple-100 text-purple-800",
} as const;

export default function TasksPage() {
  const tasks = useQuery(api.tasks.getAllTasks);
  const clientsResponse = useQuery(api.clients.getAll, {});
  const clients = clientsResponse?.clients;
  const createTask = useMutation(api.tasks.createTask);
  const updateTask = useMutation(api.tasks.updateTask);
  const deleteTask = useMutation(api.tasks.deleteTask);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<Id<"tasks"> | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(defaultFormData);
  const [selectedClient, setSelectedClient] = useState<Id<"clients"> | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) {
      alert("Please select a client");
      return;
    }

    try {
      if (editingId) {
        await updateTask({
          id: editingId,
          ...formData,
          clientId: formData.clientId,
          status: "pending",
        });
      } else {
        await createTask({
          ...formData,
          clientId: formData.clientId,
          status: "pending",
        });
      }
      setFormData(defaultFormData);
      setIsEditing(false);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving task:", error);
    }
  };

  const handleEdit = (task: any) => {
    setFormData({
      description: task.description,
      date: task.date,
      hours: task.hours,
      clientId: task.clientId,
      status: task.status,
    });
    setEditingId(task._id);
    setIsEditing(true);
  };

  const handleDelete = async (id: Id<"tasks">) => {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTask({ id });
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const filteredTasks = tasks?.filter((task) => {
    const clientMatch = selectedClient === "all" || task.clientId === selectedClient;
    const statusMatch = selectedStatus === "all" || task.status === selectedStatus;
    return clientMatch && statusMatch;
  });

  const getClientName = (clientId: Id<"clients"> | undefined) => {
    if (!clientId || !clients) return "Unknown Client";
    const client = clients.find(c => c._id === clientId);
    return client?.name || "Unknown Client";
  };

  const getClientRate = (clientId: Id<"clients"> | undefined) => {
    if (!clientId || !clients) return 0;
    const client = clients.find(c => c._id === clientId);
    return client?.hourlyRate || 0;
  };

  const getStatusBadge = (status: string, invoiced: boolean) => {
    if (invoiced) return <Badge variant="secondary">Invoiced</Badge>;
    return (
      <Badge
        variant={
          status === "completed" ? "success" : 
          status === "in-progress" ? "default" : 
          "secondary"
        }
      >
        {status}
      </Badge>
    );
  };

  return (
    <div className="py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
            <p className="mt-2 text-sm text-gray-700">
              Track your work tasks and billable hours
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value as Id<"clients"> | "all")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="all">All Clients</option>
                {clients?.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="invoiced">Invoiced</option>
              </select>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setFormData(defaultFormData);
                  setIsEditing(true);
                  setEditingId(null);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Add Task
              </Button>
            </div>
          </div>

          {isEditing && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-5 sm:p-6">
                <form onSubmit={handleSubmit}>
                  <div className="shadow sm:overflow-hidden sm:rounded-md">
                    <div className="space-y-6 bg-white px-4 py-5 sm:p-6">
                      <div>
                        <label htmlFor="client" className="block text-sm font-medium text-gray-700">
                          Client
                        </label>
                        <select
                          id="client"
                          name="client"
                          required
                          value={formData.clientId || ""}
                          onChange={(e) => setFormData({ ...formData, clientId: e.target.value as Id<"clients"> })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="">Select a client</option>
                          {clients?.map((client) => (
                            <option key={client._id} value={client._id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          rows={3}
                          required
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                          Date
                        </label>
                        <input
                          type="date"
                          id="date"
                          name="date"
                          required
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="hours" className="block text-sm font-medium text-gray-700">
                          Hours
                        </label>
                        <input
                          type="number"
                          id="hours"
                          name="hours"
                          required
                          min="0"
                          step="0.25"
                          value={formData.hours}
                          onChange={(e) => setFormData({ ...formData, hours: parseFloat(e.target.value) })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <select
                          id="status"
                          name="status"
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskFormData["status"] })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 text-right sm:px-6">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setEditingId(null);
                          setFormData(defaultFormData);
                        }}
                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 mr-3"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks?.map((task) => (
                  <tr key={task._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(task.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>{getClientName(task.clientId)}</span>
                        {task.clientId && (
                          <Link
                            href={`/dashboard/clients?id=${task.clientId}`}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="View client details"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {task.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {task.hours.toFixed(2)}h
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        {formatCurrency(task.hours * getClientRate(task.clientId))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(task.status, task.invoiced || false)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {!task.invoiced && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => handleEdit(task)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => handleDelete(task._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 