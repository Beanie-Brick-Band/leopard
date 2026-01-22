import { internalMutation } from "../_generated/server";

/**
 * Clear all data from the database
 * WARNING: This will delete ALL data in the database
 * Use this only in development to reset the database
 */
export const clearAllData = internalMutation(async (ctx) => {
  console.log("🗑️  Starting to clear all data...");

  // Get all documents from each table
  const notifications = await ctx.db.query("notifications").collect();
  const submissions = await ctx.db.query("submissions").collect();
  const flags = await ctx.db.query("flags").collect();
  const assignments = await ctx.db.query("assignments").collect();
  const classroomRelations = await ctx.db
    .query("classroomStudentsRelations")
    .collect();
  const classrooms = await ctx.db.query("classrooms").collect();
  const workspaces = await ctx.db.query("workspaces").collect();
  const events = await ctx.db.query("events").collect();
  const userProfiles = await ctx.db.query("userProfiles").collect();

  console.log(`Found ${notifications.length} notifications`);
  console.log(`Found ${submissions.length} submissions`);
  console.log(`Found ${flags.length} flags`);
  console.log(`Found ${assignments.length} assignments`);
  console.log(`Found ${classroomRelations.length} classroom relations`);
  console.log(`Found ${classrooms.length} classrooms`);
  console.log(`Found ${workspaces.length} workspaces`);
  console.log(`Found ${events.length} events`);
  console.log(`Found ${userProfiles.length} user profiles`);

  // Delete in order (respecting foreign key constraints)
  for (const doc of notifications) {
    await ctx.db.delete(doc._id);
  }
  console.log("✅ Deleted notifications");

  for (const doc of flags) {
    await ctx.db.delete(doc._id);
  }
  console.log("✅ Deleted flags");

  for (const doc of submissions) {
    await ctx.db.delete(doc._id);
  }
  console.log("✅ Deleted submissions");

  for (const doc of events) {
    await ctx.db.delete(doc._id);
  }
  console.log("✅ Deleted events");

  for (const doc of assignments) {
    await ctx.db.delete(doc._id);
  }
  console.log("✅ Deleted assignments");

  for (const doc of classroomRelations) {
    await ctx.db.delete(doc._id);
  }
  console.log("✅ Deleted classroom relations");

  for (const doc of classrooms) {
    await ctx.db.delete(doc._id);
  }
  console.log("✅ Deleted classrooms");

  for (const doc of workspaces) {
    await ctx.db.delete(doc._id);
  }
  console.log("✅ Deleted workspaces");

  for (const doc of userProfiles) {
    await ctx.db.delete(doc._id);
  }
  console.log("✅ Deleted user profiles");

  console.log("🎉 All data cleared successfully!");
});
