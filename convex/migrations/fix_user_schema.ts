import { mutation } from "../_generated/server";

export default mutation(async ({ db }) => {
  const users = await db.query("users").collect();
  
  for (const user of users) {
    await db.patch(user._id, {
      invoiceNotes: undefined,
    });
  }
}); 