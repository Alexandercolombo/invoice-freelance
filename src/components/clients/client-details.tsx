"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoadingState } from "@/components/loading-state";
import { Mail, MapPin, DollarSign, Clock, Calendar, CheckCircle2, FileText, ArrowUpRight, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";

interface ClientDetailsProps {
  clientId: Id<"clients">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetails({ clientId, open, onOpenChange }: ClientDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const client = useQuery(api.clients.getById, { id: clientId });
  const tasks = useQuery(api.tasks.getByClient, { clientId });
  const invoices = useQuery(api.invoices.getInvoices, { clientId });
  const router = useRouter();
  const [selectedTasks, setSelectedTasks] = useState<Set<Id<"tasks_v2">>>(new Set());

  if (!client || !tasks || !invoices) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] bg-white">
          <LoadingState />
        </DialogContent>
      </Dialog>
    );
  }

  const totalEarnings = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalHours = tasks.reduce((sum, task) => sum + task.hours, 0);
  const completedTasks = tasks.filter(task => task.status === "completed").length;
  const averageTaskTime = totalHours / tasks.length || 0;

  const stats = [
    {
      label: "Total Earnings",
      value: formatCurrency(totalEarnings),
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
    {
      label: "Total Hours",
      value: totalHours.toFixed(1),
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      label: "Completed Tasks",
      value: completedTasks,
      icon: CheckCircle2,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
    },
    {
      label: "Avg. Task Time",
      value: `${averageTaskTime.toFixed(1)}h`,
      icon: Calendar,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] bg-white/95 backdrop-blur-sm border shadow-lg p-0 overflow-hidden">
        <div className="relative h-32 bg-gradient-to-r from-blue-600 to-blue-400">
          <div className="absolute -bottom-16 left-6">
            <div className="h-32 w-32 rounded-xl bg-white shadow-lg p-2">
              <div className="h-full w-full rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                <span className="text-4xl font-bold text-blue-600">
                  {client.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pt-20 pb-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="h-4 w-4" />
              <a href={`mailto:${client.email}`} className="hover:text-blue-600 transition-colors">
                {client.email}
              </a>
            </div>
            {client.address && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{client.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <DollarSign className="h-4 w-4" />
              <span>{formatCurrency(client.hourlyRate)}/hr</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4 bg-white/70 backdrop-blur-sm border hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
            <TabsList className="w-full justify-start bg-gray-100/50 backdrop-blur-sm p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-white">Overview</TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:bg-white">Tasks</TabsTrigger>
              <TabsTrigger value="invoices" className="data-[state=active]:bg-white">Invoices</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <Card className="p-6 bg-white/70 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Recent Activity</h3>
                  <Button
                    onClick={() => {
                      if (selectedTasks.size > 0) {
                        // Navigate to create invoice with selected tasks
                        router.push(`/dashboard/invoices/new?tasks=${Array.from(selectedTasks).join(',')}`);
                      }
                    }}
                    disabled={selectedTasks.size === 0}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Create Invoice with Selected
                  </Button>
                </div>
                <div className="space-y-4">
                  {tasks
                    .filter(task => !task.invoiced)
                    .sort((a, b) => new Date(b.date ?? new Date()).getTime() - new Date(a.date ?? new Date()).getTime())
                    .slice(0, 5)
                    .map((task) => (
                      <motion.div
                        key={task._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 rounded-lg border bg-white hover:shadow-md transition-shadow group"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={task._id}
                            checked={selectedTasks.has(task._id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTasks(prev => new Set(prev).add(task._id));
                              } else {
                                setSelectedTasks(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(task._id);
                                  return newSet;
                                });
                              }
                            }}
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{task.description}</p>
                              <Badge variant={task.status === "completed" ? "success" : "secondary"}>
                                {task.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(task.date ?? new Date().toISOString())}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{task.hours}h</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                <span>{formatCurrency(task.amount ?? 0)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/tasks?id=${task._id}`}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="View task details"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </div>
                      </motion.div>
                    ))}
                  {tasks.filter(task => !task.invoiced).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No unbilled tasks found for this client.
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="mt-6">
              <Card className="p-6 bg-white/70 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Tasks History</h3>
                  <Link
                    href={`/dashboard/tasks?client=${clientId}`}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                  >
                    View All Tasks
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <motion.div
                      key={task._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 rounded-lg border bg-white hover:shadow-md transition-shadow group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{task.description}</p>
                          <Badge variant={task.status === "completed" ? "success" : "secondary"}>
                            {task.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(task.date ?? new Date().toISOString())}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{task.hours}h</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span>{formatCurrency(task.amount ?? 0)}</span>
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/tasks?id=${task._id}`}
                        className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all"
                        title="View task details"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </motion.div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No tasks found for this client.
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="invoices" className="mt-6">
              <Card className="p-6 bg-white/70 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Invoices History</h3>
                  <Link
                    href={`/dashboard/invoices?client=${clientId}`}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                  >
                    View All Invoices
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <motion.div
                      key={invoice._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 rounded-lg border bg-white hover:shadow-md transition-shadow group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <p className="font-medium text-gray-900">Invoice #{invoice.number}</p>
                          <Badge variant={invoice.status === "sent" ? "success" : "secondary"}>
                            {invoice.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(invoice.date ?? new Date().toISOString())}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span>{formatCurrency(invoice.total)}</span>
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/invoices?id=${invoice._id}`}
                        className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all"
                        title="View invoice details"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </motion.div>
                  ))}
                  {invoices.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No invoices found for this client.
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
} 