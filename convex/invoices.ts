import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { Resend } from "resend";
import { ConvexError } from "convex/values";
import { getUser } from "./auth";

export const getInvoices = query({
  args: {
    clientId: v.optional(v.id("clients")),
    status: v.optional(v.union(v.literal("draft"), v.literal("sent"), v.literal("paid"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    let query = ctx.db
      .query("invoices")
      .filter((q) => q.eq(q.field("userId"), identity.subject));

    if (args.clientId) {
      query = query.filter((q) => q.eq(q.field("clientId"), args.clientId));
    }

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const invoices = await query.order("desc").collect();

    // Get client details and tasks for each invoice
    const invoicesWithDetails = await Promise.all(
      invoices.map(async (invoice) => {
        const client = await ctx.db.get(invoice.clientId);
        const tasks = await ctx.db
          .query("tasks")
          .filter((q) => q.eq(q.field("invoiceId"), invoice._id))
          .collect();

        return {
          ...invoice,
          client,
          tasks,
        };
      })
    );

    return invoicesWithDetails;
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
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), identity.subject),
          q.eq(q.field("clientId"), args.clientId),
          q.eq(q.field("invoiceId"), undefined)
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
    notes: v.optional(v.string()),
    tax: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const userId = identity.subject;

    // Verify all tasks belong to the user and are not already invoiced
    for (const taskId of args.taskIds) {
      const task = await ctx.db.get(taskId);
      if (!task || task.userId !== userId || task.invoiceId !== undefined) {
        throw new ConvexError("Invalid task selection");
      }
    }

    // Calculate totals
    const tasks = await Promise.all(args.taskIds.map(id => ctx.db.get(id)));
    const validTasks = tasks.filter((task): task is NonNullable<typeof task> => task !== null);
    const subtotal = validTasks.reduce((sum, task) => sum + task.amount, 0);
    const total = subtotal + args.tax;

    // Get the next invoice number
    const lastInvoice = await ctx.db
      .query("invoices")
      .filter(q => q.eq(q.field("userId"), userId))
      .order("desc")
      .first();

    const nextNumber = lastInvoice 
      ? String(Number(lastInvoice.number) + 1).padStart(3, '0')
      : '001';

    // Create the invoice
    const invoiceId = await ctx.db.insert("invoices", {
      number: nextNumber,
      date: args.date,
      dueDate: args.dueDate,
      clientId: args.clientId,
      status: "draft",
      tasks: args.taskIds,
      subtotal,
      tax: args.tax,
      total,
      notes: args.notes,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Update tasks with invoice reference
    for (const taskId of args.taskIds) {
      await ctx.db.patch(taskId, {
        invoiceId,
        updatedAt: new Date().toISOString(),
      });
    }

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

    // Remove invoice reference from tasks
    const tasks = await ctx.db
      .query("tasks")
      .filter((q) => q.eq(q.field("invoiceId"), args.id))
      .collect();

    for (const task of tasks) {
      await ctx.db.patch(task._id, {
        invoiceId: undefined,
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