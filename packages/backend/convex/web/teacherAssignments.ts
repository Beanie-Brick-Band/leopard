import { v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  QueryCtx,
  MutationCtx,
} from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { getUserRole, requireAuth } from "./user";
import { requireInstructorAccess } from "./teacher";
import { getObjectKey } from "../helpers/storageKeys";

type DbCtx = QueryCtx | MutationCtx;

async function getClassroomForAssignment(ctx: DbCtx, assignmentId: Id<"assignments">) {
  const assignment = await ctx.db.get(assignmentId);
  if (!assignment) {
    throw new Error("Assignment not found");
  }

  const classroom = await ctx.db.get(assignment.classroomId);
  if (!classroom) {
    throw new Error("Classroom not found");
  }

  return { assignment, classroom };
}

// Internal query: verify instructor access and return assignment data
// Used by actions via ctx.runQuery(...)
export const internalGetAssignmentForInstructor = internalQuery({
  args: {
    assignmentId: v.id("assignments"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { assignment, classroom } = await getClassroomForAssignment(
      ctx,
      args.assignmentId,
    );
    await requireInstructorAccess(ctx, classroom._id, args.userId);
    return assignment;
  },
});

// Internal mutation: clear the starter code storage key
export const internalClearStarterCodeKey = internalMutation({
  args: {
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assignmentId, {
      starterCodeStorageKey: undefined,
    });
  },
});

async function requireAccessToClassroomAssignments(
  ctx: DbCtx,
  classroomId: Id<"classrooms">,
  userId: string,
) {
  const classroom = await ctx.db.get(classroomId);
  if (!classroom) {
    throw new Error("Classroom not found");
  }

  const role = await getUserRole(ctx, userId);

  if (role === "student") {
    const relation = await ctx.db
      .query("classroomStudentsRelations")
      .withIndex("studentId_classroomId", (q) =>
        q.eq("studentId", userId).eq("classroomId", classroomId),
      )
      .first();

    if (!relation) {
      throw new Error("Not authorized to view classroom assignments");
    }

    return classroom;
  }

  if (
    role === "admin" ||
    classroom.ownerId === userId ||
    classroom.assistantIds.includes(userId)
  ) {
    return classroom;
  }

  throw new Error("Not authorized to view classroom assignments");
}

export const getAssignmentsByClassroom = query({
  args: {
    classroomId: v.id("classrooms"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const classroom = await requireAccessToClassroomAssignments(
      ctx,
      args.classroomId,
      user._id,
    );

    const assignments = (
      await Promise.all(classroom.assignments.map((id) => ctx.db.get(id)))
    ).filter((a): a is NonNullable<typeof a> => a !== null);

    return assignments;
  },
});

export const createAssignment = mutation({
  args: {
    classroomId: v.id("classrooms"),
    name: v.string(),
    dueDate: v.number(),
    releaseDate: v.number(),
    description: v.optional(v.string()),
    workspaceConfig: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const classroom = await requireInstructorAccess(ctx, args.classroomId, user._id);

    const assignmentId = await ctx.db.insert("assignments", {
      classroomId: args.classroomId,
      name: args.name,
      dueDate: args.dueDate,
      releaseDate: args.releaseDate,
      description: args.description,
      workspaceConfig: args.workspaceConfig,
    });

    await ctx.db.patch(classroom._id, {
      assignments: [...classroom.assignments, assignmentId],
    });

    return assignmentId;
  },
});

export const updateAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    name: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    releaseDate: v.optional(v.number()),
    description: v.optional(v.string()),
    workspaceConfig: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const { assignment, classroom } = await getClassroomForAssignment(ctx, args.assignmentId);

    await requireInstructorAccess(ctx, classroom._id, user._id);

    const patch: {
      name?: string;
      dueDate?: number;
      releaseDate?: number;
      description?: string;
      workspaceConfig?: Record<string, unknown>;
    } = {};

    if (args.name !== undefined) patch.name = args.name;
    const newReleaseDate = args.releaseDate ?? assignment.releaseDate;
    const newDueDate = args.dueDate ?? assignment.dueDate;

    if (newDueDate <= newReleaseDate) {
      throw new Error("Due date must be after release date");
    }

    if (args.dueDate !== undefined) patch.dueDate = args.dueDate;
    if (args.releaseDate !== undefined) patch.releaseDate = args.releaseDate;

    if (args.description !== undefined) patch.description = args.description;
    if (args.workspaceConfig !== undefined) patch.workspaceConfig = args.workspaceConfig;

    if (Object.keys(patch).length === 0) {
      return assignment._id;
    }

    await ctx.db.patch(assignment._id, patch);
    return assignment._id;
  },
});

export const deleteAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const { assignment, classroom } = await getClassroomForAssignment(ctx, args.assignmentId);

    await requireInstructorAccess(ctx, classroom._id, user._id);

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("assignmentId_studentId", (q) => q.eq("assignmentId", assignment._id))
      .collect();

    for (const submission of submissions) {
      for (const flagId of submission.flags) {
        const flag = await ctx.db.get(flagId);
        if (flag) {
          await ctx.db.delete(flag._id);
        }
      }
      await ctx.db.delete(submission._id);
    }

    await ctx.db.patch(classroom._id, {
      assignments: classroom.assignments.filter((id) => id !== assignment._id),
    });

    // Schedule MinIO cleanup if starter code exists
    if (assignment.starterCodeStorageKey) {
      await ctx.scheduler.runAfter(
        0,
        internal.web.teacherAssignmentActions.internalDeleteStarterCodeObject,
        { storageKey: assignment.starterCodeStorageKey },
      );
    }

    await ctx.db.delete(assignment._id);
    return assignment._id;
  },
});

export const getSubmissionsByAssignment = query({
  args: {
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const { assignment, classroom } = await getClassroomForAssignment(ctx, args.assignmentId);

    await requireInstructorAccess(ctx, classroom._id, user._id);

    return ctx.db
      .query("submissions")
      .withIndex("assignmentId_studentId", (q) => q.eq("assignmentId", assignment._id))
      .collect();
  },
});

export const gradeSubmission = mutation({
  args: {
    submissionId: v.id("submissions"),
    grade: v.float64(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    const { classroom } = await getClassroomForAssignment(ctx, submission.assignmentId);
    await requireInstructorAccess(ctx, classroom._id, user._id);

    await ctx.db.patch(submission._id, {
      grade: args.grade,
      gradedBy: user._id,
      gradedAt: Date.now(),
    });

    return submission._id;
  },
});

export const provideSubmissionFeedback = mutation({
  args: {
    submissionId: v.id("submissions"),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    const { classroom } = await getClassroomForAssignment(ctx, submission.assignmentId);
    await requireInstructorAccess(ctx, classroom._id, user._id);

    await ctx.db.patch(submission._id, {
      submissionFeedback: args.feedback,
    });

    return submission._id;
  },
});

export const createFlag = mutation({
  args: {
    submissionId: v.id("submissions"),
    type: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    const { classroom } = await getClassroomForAssignment(ctx, submission.assignmentId);
    await requireInstructorAccess(ctx, classroom._id, user._id);

    const flagId = await ctx.db.insert("flags", {
      type: args.type,
      description: args.description,
      timestamp: Date.now(),
    });

    await ctx.db.patch(submission._id, {
      flags: [...submission.flags, flagId],
    });

    return flagId;
  },
});

export const getFlagsBySubmission = query({
  args: {
    submissionId: v.id("submissions"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    const { classroom } = await getClassroomForAssignment(ctx, submission.assignmentId);
    await requireInstructorAccess(ctx, classroom._id, user._id);

    const flags = (
      await Promise.all(submission.flags.map((id) => ctx.db.get(id)))
    ).filter((f): f is NonNullable<typeof f> => f !== null);

    return flags;
  },
});

export const deleteFlag = mutation({
  args: {
    submissionId: v.id("submissions"),
    flagId: v.id("flags"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const submission = await ctx.db.get(args.submissionId);
    if (!submission) {
      throw new Error("Submission not found");
    }

    const { classroom } = await getClassroomForAssignment(ctx, submission.assignmentId);
    await requireInstructorAccess(ctx, classroom._id, user._id);

    const flag = await ctx.db.get(args.flagId);

    if (!flag){
      throw new Error("No flag found");
    }

    const submissionContainsFlag = submission.flags.some(fid => fid === flag._id)

    if (!submissionContainsFlag){
      throw new Error("Failed to delete flag: flag does not belong to submission");
    }

    await ctx.db.delete(flag._id);

    await ctx.db.patch(submission._id, {
      flags: submission.flags.filter((id) => id !== args.flagId),
    });

    return submission._id;
  },
});

// --- Starter Code Endpoints ---

export const saveStarterCodeKey = mutation({
  args: {
    assignmentId: v.id("assignments"),
    storageKey: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const { assignment, classroom } = await getClassroomForAssignment(
      ctx,
      args.assignmentId,
    );
    await requireInstructorAccess(ctx, classroom._id, user._id);

    // Validate the storage key matches the expected format
    const expectedKey = getObjectKey(
      classroom._id,
      assignment._id,
    );
    if (args.storageKey !== expectedKey) {
      throw new Error("Invalid storage key");
    }

    await ctx.db.patch(args.assignmentId, {
      starterCodeStorageKey: args.storageKey,
    });

    return args.assignmentId;
  },
});

