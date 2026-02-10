import { v } from "convex/values";

import { mutation, query, QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { getUserRole, requireAuth, requireTeacherOrAdmin } from "./user";

type DbCtx = QueryCtx | MutationCtx;

export async function requireInstructorAccess(
  ctx: DbCtx,
  classroomId: Id<"classrooms">,
  userId: string,
) {
  await requireTeacherOrAdmin(ctx, userId);

  const classroom = await ctx.db.get(classroomId);
  if (!classroom) {
    throw new Error("Classroom not found");
  }

  const role = await getUserRole(ctx, userId);
  const isOwner = classroom.ownerId === userId;
  const isAssistant = classroom.assistantIds.includes(userId);

  if (!isOwner && !isAssistant && role !== "admin") {
    throw new Error("Not authorized for this classroom");
  }

  return classroom;
}

async function requireClassroomOwnerOrAdmin(
  ctx: DbCtx,
  classroomId: Id<"classrooms">,
  userId: string,
) {
  const classroom = await requireInstructorAccess(ctx, classroomId, userId);
  const role = await getUserRole(ctx, userId);

  if (classroom.ownerId !== userId && role !== "admin") {
    throw new Error("Only classroom owners can perform this action");
  }

  return classroom;
}

export const getMyClassrooms = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    await requireTeacherOrAdmin(ctx, user._id);

    const role = await getUserRole(ctx, user._id);
    const classrooms = await ctx.db.query("classrooms").collect();

    if (role === "admin") {
      return classrooms;
    }

    return classrooms.filter(
      (c) => c.ownerId === user._id || c.assistantIds.includes(user._id),
    );
  },
});

export const getClassroomDetails = query({
  args: {
    classroomId: v.id("classrooms"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const classroom = await requireInstructorAccess(ctx, args.classroomId, user._id);

    const assignments = (
      await Promise.all(classroom.assignments.map((id) => ctx.db.get(id)))
    ).filter((a): a is NonNullable<typeof a> => a !== null);

    const enrolledStudents = await ctx.db
      .query("classroomStudentsRelations")
      .withIndex("classroomId_studentId", (q) => q.eq("classroomId", args.classroomId))
      .collect();

    return {
      classroom,
      assignments,
      enrolledStudents,
      studentCount: enrolledStudents.length,
      pendingEnrollments: [],
    };
  },
});

export const getEnrolledStudents = query({
  args: {
    classroomId: v.id("classrooms"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    await requireInstructorAccess(ctx, args.classroomId, user._id);

    return ctx.db
      .query("classroomStudentsRelations")
      .withIndex("classroomId_studentId", (q) => q.eq("classroomId", args.classroomId))
      .collect();
  },
});

export const createClassroom = mutation({
  args: {
    className: v.string(),
    metadata: v.optional(v.string()),
    assistantIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    await requireTeacherOrAdmin(ctx, user._id);

    const assistantIds = (args.assistantIds ?? []).filter((id) => id !== user._id);

    return ctx.db.insert("classrooms", {
      className: args.className,
      metadata: args.metadata ?? "{}",
      ownerId: user._id,
      assistantIds,
      assignments: [],
    });
  },
});

export const updateClassroom = mutation({
  args: {
    classroomId: v.id("classrooms"),
    className: v.optional(v.string()),
    metadata: v.optional(v.string()),
    assistantIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    await requireInstructorAccess(ctx, args.classroomId, user._id);

    const patch: {
      className?: string;
      metadata?: string;
      assistantIds?: string[];
    } = {};

    if (args.className !== undefined) patch.className = args.className;
    if (args.metadata !== undefined) patch.metadata = args.metadata;
    if (args.assistantIds !== undefined) {
      patch.assistantIds = args.assistantIds.filter((id) => id !== user._id);
    }

    await ctx.db.patch(args.classroomId, patch);
  },
});

export const deleteClassroom = mutation({
  args: {
    classroomId: v.id("classrooms"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const classroom = await requireClassroomOwnerOrAdmin(ctx, args.classroomId, user._id);

    // Delete enrollments
    const relations = await ctx.db
      .query("classroomStudentsRelations")
      .withIndex("classroomId_studentId", (q) => q.eq("classroomId", args.classroomId))
      .collect();

    for (const relation of relations) {
      await ctx.db.delete(relation._id);
    }

    // Delete assignments + submissions + flags
    for (const assignmentId of classroom.assignments) {
      const submissions = await ctx.db
        .query("submissions")
        .withIndex("assignmentId_studentId", (q) => q.eq("assignmentId", assignmentId))
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

      const assignment = await ctx.db.get(assignmentId);
      if (assignment) {
        await ctx.db.delete(assignment._id);
      }
    }

    await ctx.db.delete(args.classroomId);
  },
});

// Compatibility endpoint for UIs expecting approval flows.
// With #89 schema, "approved" creates relation, "rejected" removes relation.
export const updateEnrollmentStatus = mutation({
  args: {
    classroomId: v.id("classrooms"),
    studentId: v.string(),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    await requireInstructorAccess(ctx, args.classroomId, user._id);

    const relation = await ctx.db
      .query("classroomStudentsRelations")
      .withIndex("studentId_classroomId", (q) =>
        q.eq("studentId", args.studentId).eq("classroomId", args.classroomId),
      )
      .first();

    if (args.status === "approved") {
      if (!relation) {
        await ctx.db.insert("classroomStudentsRelations", {
          classroomId: args.classroomId,
          studentId: args.studentId,
        });
      }
      return;
    }

    if (relation) {
      await ctx.db.delete(relation._id);
    }
  },
});

export const removeStudent = mutation({
  args: {
    classroomId: v.id("classrooms"),
    studentId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    await requireInstructorAccess(ctx, args.classroomId, user._id);

    const relation = await ctx.db
      .query("classroomStudentsRelations")
      .withIndex("studentId_classroomId", (q) =>
        q.eq("studentId", args.studentId).eq("classroomId", args.classroomId),
      )
      .first();

    if (!relation) {
      throw new Error("Student is not enrolled in this classroom");
    }

    await ctx.db.delete(relation._id);
  },
});