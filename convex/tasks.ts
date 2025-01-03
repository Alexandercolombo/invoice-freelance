import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUser } from "./auth";
import { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

export const getRecentTasks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getUser(ctx);
    const tasks = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .order("desc")
      .take(10);

    // Get all clients to map their rates
    const clients = await ctx.db
      .query("clients")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    // Enhance tasks with client rate information
    const tasksWithRates = tasks.map(task => {
      const clientMatch = clients.find(c => c.name === task.client);
      const hourlyRate = clientMatch?.hourlyRate || 0;
      const amount = task.hours * hourlyRate;
      
      return {
        ...task,
        hourlyRate,
        amount,
      };
    });

    return tasksWithRates;
  },
});

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await getUser(ctx);
    const userId = identity.subject;

    // Get unbilled tasks
    const unbilledTasks = await ctx.db
      .query("tasks")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("invoiced"), false)
        )
      )
      .collect();

    // Get all clients
    const clients = await ctx.db
      .query("clients")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    // Calculate total unbilled hours
    const totalUnbilledHours = unbilledTasks.reduce((sum, task) => sum + task.hours, 0);
    
    // Calculate total unbilled amount using client hourly rates
    const totalUnbilledAmount = unbilledTasks.reduce((sum, task) => {
      const clientMatch = clients.find(c => c.name === task.client);
      return sum + (task.hours * (clientMatch?.hourlyRate || 0));
    }, 0);

    return {
      unbilledHours: totalUnbilledHours,
      unbilledAmount: totalUnbilledAmount,
      activeClients: clients.length,
      recentTasksCount: unbilledTasks.length,
    };
  },
});

export const create = mutation({
  args: {
    client: v.string(),
    description: v.string(),
    hours: v.number(),
    date: v.string(),
    status: v.union(v.literal("pending"), v.literal("in-progress"), v.literal("completed")),
  },
  handler: async (ctx, args) => {
    const identity = await getUser(ctx);
    const userId = identity.subject;

    // Find the client by name to get the clientId
    const client = await ctx.db
      .query("clients")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("name"), args.client)
        )
      )
      .first();

    if (!client) {
      throw new Error("Client not found");
    }

    const task = await ctx.db.insert("tasks", {
      clientId: client._id,
      client: args.client,
      description: args.description,
      hours: args.hours,
      date: args.date,
      status: args.status,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      invoiced: false,
    });

    const taskWithRate = {
      _id: task,
      clientId: client._id,
      client: args.client,
      description: args.description,
      hours: args.hours,
      date: args.date,
      status: args.status,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      invoiced: false,
      hourlyRate: client.hourlyRate,
      amount: args.hours * client.hourlyRate
    };

    return taskWithRate;
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    client: v.string(),
    description: v.string(),
    hours: v.number(),
    date: v.string(),
    status: v.union(v.literal("pending"), v.literal("in-progress"), v.literal("completed")),
  },
  handler: async (ctx, args) => {
    const identity = await getUser(ctx);
    const { id, ...updates } = args;

    const existingTask = await ctx.db.get(id);
    if (!existingTask || existingTask.userId !== identity.subject) {
      throw new Error("Task not found or access denied");
    }

    return await ctx.db.patch(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await getUser(ctx);
    
    const existingTask = await ctx.db.get(args.id);
    if (!existingTask || existingTask.userId !== identity.subject) {
      throw new Error("Task not found or access denied");
    }

    if (existingTask.invoiced) {
      throw new Error("Cannot delete an invoiced task");
    }

    await ctx.db.delete(args.id);
  },
});

export const getTasksByIds = query({
  args: { ids: v.array(v.id("tasks")) },
  handler: async (ctx, args) => {
    const tasks = await Promise.all(
      args.ids.map(id => ctx.db.get(id))
    );
    
    // Filter out any null values and enhance tasks with client info
    const validTasks = tasks.filter((task): task is NonNullable<typeof task> => task !== null);
    
    return await Promise.all(
      validTasks.map(async (task) => {
        if (!task.clientId) {
          return {
            ...task,
            client: task.client || 'Unknown Client',
            hourlyRate: 0,
            amount: 0
          };
        }

        const client = await ctx.db.get(task.clientId);
        if (!client) {
          return {
            ...task,
            client: 'Unknown Client',
            hourlyRate: 0,
            amount: 0
          };
        }
        
        return {
          ...task,
          client: client.name,
          hourlyRate: client.hourlyRate,
          amount: task.hours * client.hourlyRate
        };
      })
    ).then(tasks => tasks.filter((task): task is NonNullable<typeof task> => task !== null));
  },
});

export const getByClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const client = await ctx.db.get(args.clientId);
    if (!client) {
      throw new ConvexError("Client not found");
    }

    const tasks = await ctx.db
      .query("tasks")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), identity.subject),
          q.eq(q.field("clientId"), args.clientId)
        )
      )
      .order("desc")
      .collect();

    // Calculate amount for each task using the client's hourly rate as fallback
    return tasks.map(task => ({
      ...task,
      hourlyRate: task.hourlyRate || client.hourlyRate || 0,
      amount: (task.hours || 0) * (task.hourlyRate || client.hourlyRate || 0)
    }));
  },
});

export const getAllTasks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const tasks = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .order("desc")
      .collect();

    return tasks;
  },
});

export const createTask = mutation({
  args: {
    description: v.string(),
    hours: v.number(),
    date: v.string(),
    clientId: v.optional(v.id("clients")),
    status: v.union(v.literal("pending"), v.literal("in-progress"), v.literal("completed")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    let hourlyRate = 0;
    if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (client) {
        hourlyRate = client.hourlyRate;
      }
    }

    const task = await ctx.db.insert("tasks", {
      userId: identity.subject,
      description: args.description,
      hours: args.hours,
      date: args.date,
      clientId: args.clientId,
      status: args.status,
      hourlyRate: hourlyRate,
      amount: hourlyRate * args.hours,
      invoiced: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return task;
  },
});

export const updateTask = mutation({
  args: {
    id: v.id("tasks"),
    description: v.optional(v.string()),
    hours: v.optional(v.number()),
    date: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    status: v.optional(v.union(v.literal("pending"), v.literal("in-progress"), v.literal("completed"))),
    invoiced: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const existingTask = await ctx.db.get(args.id);
    if (!existingTask || existingTask.userId !== identity.subject) {
      throw new ConvexError("Task not found");
    }

    let hourlyRate = existingTask.hourlyRate;
    if (args.clientId) {
      const client = await ctx.db.get(args.clientId);
      if (client) {
        hourlyRate = client.hourlyRate;
      }
    }

    const hours = args.hours ?? existingTask.hours;
    const amount = hourlyRate * hours;

    const updates = {
      ...args,
      hourlyRate,
      amount,
      updatedAt: new Date().toISOString(),
    };

    delete updates.id;
    const updatedTask = await ctx.db.patch(args.id, updates);
    return updatedTask;
  },
});

export const deleteTask = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const task = await ctx.db.get(args.id);
    if (!task || task.userId !== identity.subject) {
      throw new ConvexError("Task not found");
    }

    await ctx.db.delete(args.id);
    return task;
  },
});

export const deleteAllUserData = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Get all user's tasks
    const tasks = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    // Get all user's invoices
    const invoices = await ctx.db
      .query("invoices")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    // Delete all tasks
    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    // Delete all invoices
    for (const invoice of invoices) {
      await ctx.db.delete(invoice._id);
    }

    return { deletedTasks: tasks.length, deletedInvoices: invoices.length };
  },
}); 