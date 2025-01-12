import { internalMutation } from "../_generated/server";

export const updateTasks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    
    for (const task of tasks) {
      await ctx.db.patch(task._id, {
        invoiced: false
      });
    }
    
    return tasks.length;
  },
}); 