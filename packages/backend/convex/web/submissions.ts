import { v } from "convex/values";

import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// Get or create submission for student
export const getOrCreateSubmission = mutation({
  args: {
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    // Check if submission already exists
    const existingSubmission = await ctx.db
      .query("submissions")
      .withIndex("by_assignment_student", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", user._id),
      )
      .first();

    if (existingSubmission) {
      return existingSubmission._id;
    }

    // Create new submission
    const submissionId = await ctx.db.insert("submissions", {
      assignmentId: args.assignmentId,
      studentId: user._id,
      submitted: false,
      createdAt: Date.now(),
    });

    return submissionId;
  },
});

// Submit an assignment
export const submitAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    workspaceId: v.optional(v.id("workspaces")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get or create submission
    let submission = await ctx.db
      .query("submissions")
      .withIndex("by_assignment_student", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", user._id),
      )
      .first();

    if (!submission) {
      const submissionId = await ctx.db.insert("submissions", {
        assignmentId: args.assignmentId,
        studentId: user._id,
        workspaceId: args.workspaceId,
        submitted: true,
        submittedAt: Date.now(),
        createdAt: Date.now(),
      });

      return submissionId;
    }

    // Update existing submission
    await ctx.db.patch(submission._id, {
      submitted: true,
      submittedAt: Date.now(),
      workspaceId: args.workspaceId,
    });

    return submission._id;
  },
});

// Get student's own submissions
export const getMySubmissions = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return [];
    }

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .collect();

    return submissions;
  },
});

// Get submission for specific assignment
export const getMySubmissionForAssignment = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return null;
    }

    const submission = await ctx.db
      .query("submissions")
      .withIndex("by_assignment_student", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", user._id),
      )
      .first();

    return submission;
  },
});

// Unsubmit an assignment (allow resubmission)
export const unsubmitAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    const submission = await ctx.db
      .query("submissions")
      .withIndex("by_assignment_student", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("studentId", user._id),
      )
      .first();

    if (!submission) {
      throw new Error("Submission not found");
    }

    // Don't allow unsubmit if already graded
    if (submission.grade !== undefined) {
      throw new Error("Cannot unsubmit a graded assignment");
    }

    await ctx.db.patch(submission._id, {
      submitted: false,
      submittedAt: undefined,
    });
  },
});
