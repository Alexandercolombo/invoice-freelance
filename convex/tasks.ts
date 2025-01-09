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