import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { Resend } from "resend";
import { ConvexError } from "convex/values";
import { getUser } from "./auth";

export const getInvoices = query({
  args: { clientId: v.id("clients") },
  async handler(ctx, args) {
    const identity = await getUser(ctx);
    return await ctx.db
      .query("invoices")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();
  },
});

export const getUnbilledTasksByClient = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }
    
    return await ctx.db
      .query("tasks")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), identity.subject),
          q.eq(q.field("invoiced"), false)
        )
      )
      .collect();
  },
});

export const createInvoice = mutation({
  args: {
    clientId: v.id("clients"),
    taskIds: v.array(v.id("tasks")),
    date: v.string(),
    dueDate: v.string(),
    tax: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Get tasks and calculate totals
    const tasks = await Promise.all(
      args.taskIds.map(id => ctx.db.get(id))
    );

    // Verify all tasks exist and belong to this user
    if (tasks.some(task => !task || task.userId !== identity.subject)) {
      throw new ConvexError("One or more tasks not found or access denied");
    }

    const subtotal = tasks.reduce((sum, task) => sum + (task.amount ?? 0), 0);
    const total = subtotal + (subtotal * args.tax / 100);

    // Create invoice
    const invoiceId = await ctx.db.insert("invoices", {
      number: new Date().getTime().toString(), // Simple number generation
      date: args.date,
      dueDate: args.dueDate,
      clientId: args.clientId,
      tasks: args.taskIds,
      subtotal,
      tax: args.tax,
      total,
      status: "draft",
      userId: identity.subject,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Mark tasks as invoiced
    await Promise.all(
      args.taskIds.map(taskId =>
        ctx.db.patch(taskId, { invoiced: true })
      )
    );

    return invoiceId;
  },
});

export const updateInvoiceStatus = mutation({
  args: {
    id: v.id("invoices"),
    status: v.union(v.literal("draft"), v.literal("sent"), v.literal("paid")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const invoice = await ctx.db.get(args.id);
    if (!invoice || invoice.userId !== identity.subject) {
      throw new ConvexError("Invoice not found or access denied");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: new Date().toISOString(),
    });

    return await ctx.db.get(args.id);
  },
});

export const deleteInvoice = mutation({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const invoice = await ctx.db.get(args.id);
    if (!invoice || invoice.userId !== identity.subject) {
      throw new ConvexError("Invoice not found");
    }

    // Mark tasks as not invoiced
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_client", (q) => q.eq("clientId", invoice.clientId))
      .filter((q) => invoice.tasks.includes(q.field("_id")))
      .collect();

    for (const task of tasks) {
      await ctx.db.patch(task._id, {
        invoiced: false,
        updatedAt: new Date().toISOString(),
      });
    }

    // Delete the invoice
    await ctx.db.delete(args.id);
    return true;
  },
});

export const getInvoice = query({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const invoice = await ctx.db.get(args.id);
    if (!invoice || invoice.userId !== identity.subject) {
      return null;
    }

    // Get client details
    const client = await ctx.db.get(invoice.clientId);
    if (!client) {
      return null;
    }

    // Get tasks
    const tasks = await Promise.all(
      invoice.tasks.map(async (taskId) => {
        const task = await ctx.db.get(taskId);
        return task;
      })
    );

    return {
      ...invoice,
      client,
      tasks: tasks.filter(Boolean),
    };
  },
});

export const sendInvoice = mutation({
  args: {
    invoiceId: v.id("invoices"),
    recipientEmail: v.string(),
    recipientName: v.string(),
  },
  async handler(ctx, args) {
    const { RESEND_API_KEY, NEXT_PUBLIC_BASE_URL } = process.env;
    if (!RESEND_API_KEY) {
      throw new ConvexError("Missing RESEND_API_KEY in environment variables");
    }
    if (!NEXT_PUBLIC_BASE_URL) {
      throw new ConvexError("Missing NEXT_PUBLIC_BASE_URL in environment variables");
    }

    const resend = new Resend(RESEND_API_KEY);

    try {
      await resend.emails.send({
        from: "invoices@example.com",
        to: args.recipientEmail,
        subject: "New Invoice",
        html: `<p>Dear ${args.recipientName},</p>
              <p>A new invoice has been generated for you.</p>
              <p>Please click the link below to view your invoice:</p>
              <p><a href="${NEXT_PUBLIC_BASE_URL}/invoices/${args.invoiceId}/preview">View Invoice</a></p>`,
      });

      // Update invoice status
      const invoice = await ctx.db.get(args.invoiceId);
      if (!invoice) {
        throw new ConvexError("Invoice not found");
      }

      await ctx.db.patch(args.invoiceId, {
        status: "sent",
        updatedAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to send invoice email:", error);
      throw new ConvexError("Failed to send invoice email");
    }
  },
});

export const markAsPaid = mutation({
  args: {
    id: v.id("invoices"),
  },
  async handler(ctx, args) {
    const identity = await getUser(ctx);
    const invoice = await ctx.db.get(args.id);
    
    if (!invoice || invoice.userId !== identity.subject) {
      throw new Error("Invoice not found or access denied");
    }

    // Update invoice status
    await ctx.db.patch(args.id, {
      status: "paid",
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Update associated tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.id))
      .collect();

    for (const task of tasks) {
      await ctx.db.patch(task._id, { 
        status: "completed",
        updatedAt: new Date().toISOString(),
      });
    }

    return true;
  },
}); 