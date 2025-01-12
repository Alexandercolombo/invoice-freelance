import { mutation } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

export default mutation(async ({ db }) => {
  // Get all tasks
  const tasks = await db.query("tasks").collect();
  
  // Update each task to add the invoiced field
  for (const task of tasks) {
    await db.patch(task._id, {
      invoiced: false // Set all existing tasks as not invoiced
    });
  }
}); 