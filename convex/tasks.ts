import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUser } from "./auth";

export const list = query({
  args: {},
  async handler(ctx) {
    const identity = await getUser(ctx);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return tasks;
  },
});

export const create = mutation({
  args: {
    description: v.string(),
    hours: v.number(),
    date: v.string(),
    clientId: v.id("clients"),
    hourlyRate: v.number(),
    status: v.union(v.literal("pending"), v.literal("completed")),
  },
  async handler(ctx, args) {
    const identity = await getUser(ctx);

    const amount = args.hourlyRate * args.hours;

    return await ctx.db.insert("tasks", {
      description: args.description,
      hours: args.hours,
      date: args.date,
      clientId: args.clientId,
      hourlyRate: args.hourlyRate,
      amount,
      status: args.status,
      userId: identity.subject,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
});

export const getTasksByIds = query({
  args: { ids: v.array(v.id("tasks")) },
  async handler(ctx, args) {
    const identity = await getUser(ctx);
    const tasks = await Promise.all(
      args.ids.map(id => ctx.db.get(id))
    );
    
    // Filter out any null values and verify user access
    return tasks
      .filter((task): task is NonNullable<typeof task> => 
        task !== null && task.userId === identity.subject
      )
      .map(task => ({
        ...task,
        amount: task.hours * (task.hourlyRate ?? 0)
      }));
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    description: v.string(),
    hours: v.number(),
    date: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed")),
  },
  async handler(ctx, args) {
    const identity = await getUser(ctx);
    
    const task = await ctx.db.get(args.id);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Task not found or access denied");
    }

    const { id, ...updates } = args;
    const amount = (task.hourlyRate ?? 0) * updates.hours;

    await ctx.db.patch(id, {
      ...updates,
      amount,
      updatedAt: new Date().toISOString(),
    });

    return await ctx.db.get(id);
  },
});

export const getRecentTasks = query({
  args: {},
  async handler(ctx) {
    const identity = await getUser(ctx);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => 
        q.gte(q.field("createdAt"), thirtyDaysAgo.toISOString())
      )
      .order("desc")
      .collect();
  },
});

export const getDashboardStats = query({
  args: {},
  async handler(ctx) {
    const identity = await getUser(ctx);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all tasks for the user
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    // Calculate unbilled tasks
    const unbilledTasks = tasks.filter(task => !task.invoiced);
    const unbilledAmount = unbilledTasks.reduce((sum, task) => sum + (task.amount ?? 0), 0);
    const unbilledHours = unbilledTasks.reduce((sum, task) => sum + task.hours, 0);

    // Get recent tasks count
    const recentTasks = tasks.filter(task => 
      new Date(task.createdAt) >= thirtyDaysAgo
    );

    // Get active clients (clients with unbilled tasks)
    const activeClientIds = new Set(unbilledTasks.map(task => task.clientId.toString()));

    return {
      unbilledAmount,
      unbilledHours,
      recentTasksCount: recentTasks.length,
      activeClients: activeClientIds.size,
    };
  },
}); 