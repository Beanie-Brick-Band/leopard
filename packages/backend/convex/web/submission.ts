import { v } from "convex/values";

import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import {
  internalMutation,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "../_generated/server";
import { authComponent } from "../auth";
import { getUserRole } from "../helpers/roles";
import { ensureCanAccessAssignment } from "./assignment";

type DatabaseCtx = QueryCtx | MutationCtx;

const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const requireStudentRole = async (ctx: DatabaseCtx, userId: string) => {
  const role = await getUserRole(ctx, userId);
  if (role !== "student" && role !== "admin") {
    throw new Error("Only students can submit and view their own submissions");
  }
  return role;
};

export const checkGraderAccess = async (
  uid: string,
  ctx: DatabaseCtx,
  assignmentId: Id<"assignments">,
) => {
  const assignment = await ctx.db.get(assignmentId);
  if (!assignment) {
    throw new Error("Assignment not found");
  }
  const classroom = await ctx.db.get(assignment.classroomId);
  if (!classroom) {
    throw new Error("Classroom not found");
  }

  const role = await getUserRole(ctx, uid);
  if (role === "admin") {
    return;
  }

  if (!(classroom.ownerId === uid || classroom.assistantIds.includes(uid))) {
    throw new Error(
      "Insufficient permissions to provide feedback on this submission",
    );
  }
};

const checkAuth = async (ctx: DatabaseCtx) => {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
};

export const gradeSubmission = mutation({
  args: {
    submissionId: v.id("submissions"),
    grade: v.float64(),
  },
  handler: async (ctx, args) => {
    const user = await checkAuth(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    await checkGraderAccess(user._id, ctx, submission.assignmentId);

    await ctx.db.patch(args.submissionId, {
      grade: args.grade,
      gradedBy: user._id,
      gradedAt: Date.now(),
    });
    return { success: true };
  },
});

export const provideSubmissionFeedback = mutation({
  args: {
    submissionId: v.id("submissions"),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await checkAuth(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    await checkGraderAccess(user._id, ctx, submission.assignmentId);

    await ctx.db.patch(args.submissionId, {
      submissionFeedback: args.feedback,
    });
    return { success: true };
  },
});

export const getOwnSubmissionsForAssignment = query({
  args: {
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, args) => {
    const user = await checkAuth(ctx);
    await requireStudentRole(ctx, user._id);

    const submission = await ctx.db
      .query("submissions")
      .withIndex("studentId_assignmentId", (q) =>
        q.eq("studentId", user._id).eq("assignmentId", args.assignmentId),
      )
      .first();

    if (!submission) {
      return { success: false };
    }

    if (submission.gradesReleased) {
      return { success: true, submission: submission };
    }

    const publicSubmissionInfo = {
      _id: submission._id,
      workspaceId: submission.workspaceId,
      studentId: submission.studentId,
      assignmentId: submission.assignmentId,
      submittedAt: submission.submittedAt,
      gradesReleased: submission.gradesReleased,
    };

    return { success: true, submission: publicSubmissionInfo };
  },
});

export const getAllSubmissionsForAssignment = query({
  args: {
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, args) => {
    const user = await checkAuth(ctx);

    await checkGraderAccess(user._id, ctx, args.assignmentId);

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("assignmentId_studentId", (q) =>
        q.eq("assignmentId", args.assignmentId),
      )
      .collect();
    return submissions;
  },
});

// --- Submission lifecycle internal mutations ---

/**
 * Core submission logic: validates enrollment, due date, and duplicate submissions,
 * then creates the submission record. A timeout is scheduled to auto-delete the
 * record if the upload isn't confirmed within 5 minutes.
 * Called by the triggerSubmission action which handles auth and external services.
 */
export const internalSubmitAssignment = internalMutation({
  args: {
    assignmentId: v.id("assignments"),
    studentId: v.string(),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await requireStudentRole(ctx, args.studentId);
    const assignment = await ensureCanAccessAssignment(
      ctx,
      args.studentId,
      args.assignmentId,
    );

    if (Date.now() > assignment.dueDate) {
      throw new Error("Cannot submit after the due date");
    }

    const existing = await ctx.db
      .query("submissions")
      .withIndex("studentId_assignmentId", (q) =>
        q.eq("studentId", args.studentId).eq("assignmentId", args.assignmentId),
      )
      .first();

    if (existing?.submissionStorageKey) {
      throw new Error("Assignment already submitted");
    }

    // Delete inflight submission before creating a new one
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    const submissionId = await ctx.db.insert("submissions", {
      assignmentId: args.assignmentId,
      studentId: args.studentId,
      workspaceId: args.workspaceId,
      flags: [],
      flagged: false,
      submittedAt: Date.now(),
      gradesReleased: false,
    });
    await ctx.scheduler.runAfter(
      UPLOAD_TIMEOUT_MS,
      internal.web.submission.internalExpireStaleUpload,
      { submissionId },
    );
    return submissionId;
  },
});

export const internalConfirmSubmission = internalMutation({
  args: {
    submissionId: v.id("submissions"),
    submissionStorageKey: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.submissionId, {
      submittedAt: Date.now(),
      submissionStorageKey: args.submissionStorageKey,
    });
  },
});

export const internalFailSubmission = internalMutation({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.submissionId);
  },
});

export const internalExpireStaleUpload = internalMutation({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const submission = await ctx.db.get(args.submissionId);
    if (submission && !submission.submissionStorageKey) {
      await ctx.db.delete(args.submissionId);
    }
  },
});

export const toggleSubmissionFlag = mutation({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const user = await checkAuth(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    await checkGraderAccess(user._id, ctx, submission.assignmentId);

    await ctx.db.patch(args.submissionId, {
      flagged: !submission.flagged,
    });
    return;
  },
});
