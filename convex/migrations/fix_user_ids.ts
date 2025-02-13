import { internalMutation } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { DatabaseReader, DatabaseWriter, MutationCtx } from "../_generated/server";

interface Invoice extends Doc<"invoices"> {
  userId: string;
}

interface Client extends Doc<"clients"> {
  userId: string;
}

interface Task extends Doc<"tasks_v2"> {
  userId: string;
}

/**
 * Migration script to update all user IDs from subject to tokenIdentifier
 */
export const migrateUserIds = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("[Debug] Starting user ID migration");
    
    // Get all users to build a mapping
    const users = await ctx.db.query("users").collect();
    console.log("[Debug] Found", users.length, "users");

    // Create a mapping of subject to tokenIdentifier
    const userIdMap = new Map<string, string>();
    for (const user of users) {
      // We'll use the tokenIdentifier as the source of truth
      userIdMap.set(user.tokenIdentifier, user.tokenIdentifier);
    }

    // Update invoices
    const allInvoices = await ctx.db.query("invoices").collect();
    console.log("[Debug] Found", allInvoices.length, "invoices to check");

    let updatedInvoices = 0;
    for (const invoice of allInvoices) {
      const correctId = userIdMap.get(invoice.userId);
      if (correctId && invoice.userId !== correctId) {
        console.log("[Debug] Updating invoice", invoice._id, "from", invoice.userId, "to", correctId);
        await ctx.db.patch(invoice._id, {
          userId: correctId,
          updatedAt: new Date().toISOString()
        });
        updatedInvoices++;
      }
    }

    // Update clients
    const allClients = await ctx.db.query("clients").collect();
    console.log("[Debug] Found", allClients.length, "clients to check");

    let updatedClients = 0;
    for (const client of allClients) {
      const correctId = userIdMap.get(client.userId);
      if (correctId && client.userId !== correctId) {
        console.log("[Debug] Updating client", client._id, "from", client.userId, "to", correctId);
        await ctx.db.patch(client._id, {
          userId: correctId,
          updatedAt: new Date().toISOString()
        });
        updatedClients++;
      }
    }

    // Update tasks
    const allTasks = await ctx.db.query("tasks_v2").collect();
    console.log("[Debug] Found", allTasks.length, "tasks to check");

    let updatedTasks = 0;
    for (const task of allTasks) {
      const correctId = userIdMap.get(task.userId);
      if (correctId && task.userId !== correctId) {
        console.log("[Debug] Updating task", task._id, "from", task.userId, "to", correctId);
        await ctx.db.patch(task._id, {
          userId: correctId,
          updatedAt: new Date().toISOString()
        });
        updatedTasks++;
      }
    }

    return {
      message: "Migration complete",
      stats: {
        users: users.length,
        invoices: {
          total: allInvoices.length,
          updated: updatedInvoices
        },
        clients: {
          total: allClients.length,
          updated: updatedClients
        },
        tasks: {
          total: allTasks.length,
          updated: updatedTasks
        }
      }
    };
  }
});

export const fixUserIds = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all invoices
    const invoices = await ctx.db.query("invoices").collect();
    
    console.log("[Migration] Starting user ID fix for", invoices.length, "invoices");
    
    let updatedCount = 0;
    for (const invoice of invoices) {
      const currentUserId = invoice.userId;
      
      // Skip if already in short format
      if (!currentUserId.includes("|")) {
        continue;
      }
      
      // Extract short user ID
      const shortUserId = currentUserId.split("|").pop() || currentUserId;
      
      // Update invoice with short user ID
      await ctx.db.patch(invoice._id, {
        userId: shortUserId,
        updatedAt: new Date().toISOString()
      });
      
      updatedCount++;
      console.log("[Migration] Updated invoice", invoice._id, {
        from: currentUserId,
        to: shortUserId
      });
    }
    
    console.log("[Migration] Completed user ID fixes. Updated", updatedCount, "invoices");
    return { updatedCount };
  }
}); 