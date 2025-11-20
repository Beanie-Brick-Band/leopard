import { formatISO } from "date-fns";

import { internalMutation } from "../_generated/server";

export const createMock = internalMutation(async (ctx) => {
  if (
    (await ctx.db.query("assignments").collect()).length > 0 &&
    (await ctx.db.query("classrooms").collect()).length > 0
  ) {
    throw new Error("Mock data already exists");
  }

  const assignment1Id = await ctx.db.insert("assignments", {
    dueDate: formatISO(new Date(2030, 6, 30)), // July 30, 2030 - sometime in the future
    name: "Sample Homework",
  });

  const assignment2Id = await ctx.db.insert("assignments", {
    dueDate: formatISO(new Date(2030, 7, 15)), // August 15, 2030 - sometime in the future
    name: "Sample Project",
  });

  const assignment3Id = await ctx.db.insert("assignments", {
    dueDate: formatISO(new Date(2030, 8, 1)), // September 1, 2030 - sometime in the future
    name: "MNIST CNN Exploration",
  });

  await ctx.db.insert("classrooms", {
    assignments: [assignment1Id, assignment2Id],
    className: "DSA 101",
    metadata: "{}",
    ownerId: "user_123", // sample user that does not exist
  });

  await ctx.db.insert("classrooms", {
    assignments: [assignment3Id],
    className: "ML 102",
    metadata: "{}",
    ownerId: "user_456", // sample user that does not exist
  });
});
