import { mutation } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

interface Invoice extends Doc<"invoices"> {
  userId: string;
}

/**
 * Migration script to update invoice user IDs from subject to tokenIdentifier
 */
export const migrateUserIds = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("[Debug] Starting user ID migration");
    
    // Get all invoices
    const allInvoices = await ctx.db.query("invoices").collect();
    console.log("[Debug] Found", allInvoices.length, "invoices to check");

    let updatedCount = 0;
    const errors: any[] = [];

    // Get the user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("No user identity found");
    }

    console.log("[Debug] User identity:", {
      subject: identity.subject,
      tokenIdentifier: identity.tokenIdentifier
    });

    for (const invoice of allInvoices) {
      try {
        // Check if the invoice uses the old subject format
        if (invoice.userId === identity.subject) {
          console.log("[Debug] Updating invoice", invoice._id, "from", invoice.userId, "to", identity.tokenIdentifier);
          
          // Update to use tokenIdentifier
          await ctx.db.patch(invoice._id, {
            userId: identity.tokenIdentifier,
            updatedAt: new Date().toISOString()
          });
          
          updatedCount++;
        } else {
          console.log("[Debug] Invoice", invoice._id, "already using correct ID format");
        }
      } catch (error) {
        console.error("[Error] Failed to update invoice", invoice._id, error);
        errors.push({ invoiceId: invoice._id, error: (error as Error).message });
      }
    }

    return {
      message: "Migration complete",
      stats: {
        total: allInvoices.length,
        updated: updatedCount,
        errors: errors.length
      },
      errors
    };
  }
}); 