import { v } from "convex/values";

import { internalQuery } from "../_generated/server";
import { requireInstructorAccess } from "./teacher";

export const getUserRecord = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("uid", (q) => q.eq("uid", args.userId))
      .first();
  },
});

/** Convex actions can't access ctx.db, so they call these internalQueries via ctx.runQuery */
export const getAssignment = internalQuery({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.assignmentId);
  },
});

/** Convex actions can't access ctx.db, so they call these internalQueries via ctx.runQuery */
export const getClassroom = internalQuery({
  args: { classroomId: v.id("classrooms") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.classroomId);
  },
});

export const checkEnrollment = internalQuery({
  args: { studentId: v.string(), classroomId: v.id("classrooms") },
  handler: async (ctx, args) => {
    const relation = await ctx.db
      .query("classroomStudentsRelations")
      .withIndex("studentId_classroomId", (q) =>
        q.eq("studentId", args.studentId).eq("classroomId", args.classroomId),
      )
      .first();
    return !!relation;
  },
});

export const getStudentSubmission = internalQuery({
  args: { studentId: v.string(), assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("submissions")
      .withIndex("studentId_assignmentId", (q) =>
        q.eq("studentId", args.studentId).eq("assignmentId", args.assignmentId),
      )
      .first();
  },
});

export const getSubmissionForDownload = internalQuery({
  args: { submissionId: v.id("submissions"), userId: v.string() },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (!submission) return null;

    const assignment = await ctx.db.get(submission.assignmentId);
    if (!assignment) return null;

    // Verify teacher/admin access
    await requireInstructorAccess(ctx, assignment.classroomId, args.userId);

    return submission;
  },
});
