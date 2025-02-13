import { internalMutation } from "../_generated/server";

export const runMigrations = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("[Migration] Starting migrations");
    
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
  },
}); 