"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/client-utils";
import { Clock, DollarSign, Users, FileText } from "lucide-react";

export function DashboardStats() {
  const stats = useQuery(api.tasks.getDashboardStats);

  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-20 bg-gray-200 rounded" />
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Unbilled Amount",
      value: formatCurrency(stats.unbilledAmount),
      icon: DollarSign,
      description: "Total unbilled amount",
    },
    {
      title: "Unbilled Hours",
      value: stats.unbilledHours.toFixed(2),
      icon: Clock,
      description: "Total unbilled hours",
    },
    {
      title: "Active Clients",
      value: stats.activeClients,
      icon: Users,
      description: "Clients with unbilled tasks",
    },
    {
      title: "Recent Tasks",
      value: stats.recentTasksCount,
      icon: FileText,
      description: "Tasks in last 30 days",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title} className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <stat.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {stat.title}
              </p>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stat.value}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stat.description}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
} 