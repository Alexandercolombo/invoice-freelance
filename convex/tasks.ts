import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUser } from "./auth";

export const list = query({
  args: {},
  async handler(ctx) {
    const identity = await getUser(ctx);
    const tasks = await ctx.db
      .query("tasks_v2")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return tasks;
  },
});

export const create = mutation({
  args: {
    description: v.string(),
    hours: v.float64(),
    date: v.string(),
    clientId: v.id("clients"),
    hourlyRate: v.float64(),
    status: v.union(v.literal("pending"), v.literal("completed")),
    invoiced: v.optional(v.boolean()),
  },
  async handler(ctx, args) {
    const identity = await getUser(ctx);

    const amount = args.hourlyRate * args.hours;

    return await ctx.db.insert("tasks_v2", {
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
      invoiced: args.invoiced ?? false
    });
  },
});

export const getTasksByIds = query({
  args: { ids: v.array(v.id("tasks_v2")) },
  async handler(ctx, args) {
    const identity = await getUser(ctx);
    const tasks = await Promise.all(
      args.ids.map(id => ctx.db.get(id))
    );
    
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
    id: v.id("tasks_v2"),
    description: v.string(),
    hours: v.float64(),
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("tasks_v2")
      .withIndex("by_user_and_invoiced", (q) => 
        q.eq("userId", identity.subject)
         .eq("invoiced", false)
      )
      .order("desc")
      .collect();
  },
});

export const getDashboardStats = query({
  args: {},
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        unbilledAmount: 0,
        unbilledHours: 0,
        recentTasksCount: 0,
        activeClients: 0,
      };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tasks = await ctx.db
      .query("tasks_v2")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    const unbilledTasks = tasks.filter(task => !task.invoiced);
    const unbilledAmount = unbilledTasks.reduce((sum, task) => sum + (task.amount ?? 0), 0);
    const unbilledHours = unbilledTasks.reduce((sum, task) => sum + task.hours, 0);

    const recentTasks = tasks.filter(task => 
      task.createdAt && new Date(task.createdAt) >= thirtyDaysAgo
    );

    const activeClientIds = new Set(unbilledTasks.map(task => task.clientId.toString()));

    return {
      unbilledAmount,
      unbilledHours,
      recentTasksCount: recentTasks.length,
      activeClients: activeClientIds.size,
    };
  },
});

export const getByClient = query({
  args: { clientId: v.id("clients") },
  async handler(ctx, args) {
    const identity = await getUser(ctx);
    return await ctx.db
      .query("tasks_v2")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();
  },
});

export const updateAllTasks = mutation({
  args: {},
  async handler(ctx) {
    const identity = await getUser(ctx);
    const tasks = await ctx.db
      .query("tasks_v2")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();
    
    for (const task of tasks) {
      await ctx.db.patch(task._id, {
        invoiced: false
      });
    }
    
    return tasks.length;
  },
});

export const deleteTask = mutation({
  args: { id: v.id("tasks_v2") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.userId !== identity.subject) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.id);
  },
}); 