import { internalMutation } from "../_generated/server";

export const migrateTasks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    
    for (const task of tasks) {
      const { _id, _creationTime, ...taskData } = task;
      await ctx.db.insert("tasks_v2", {
        ...taskData,
        invoiced: false
      });
    }
    
    return tasks.length;
  },
}); 