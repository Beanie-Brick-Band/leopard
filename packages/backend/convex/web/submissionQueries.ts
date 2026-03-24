import { v } from "convex/values";

import { internalQuery } from "../_generated/server";
import { checkGraderAccess } from "./submission";

/** Convex actions can't access ctx.db, so they call these internalQueries via ctx.runQuery */
export const getAssignment = internalQuery({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.assignmentId);
  },
});

export const getSubmissionForDownload = internalQuery({
  args: { submissionId: v.id("submissions"), userId: v.string() },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) return null;

    await checkGraderAccess(args.userId, ctx, submission.assignmentId);

    return submission;
  },
});
