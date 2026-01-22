import { v } from "convex/values";

import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

export const getEnrolled = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return [];
    }

    // Get approved enrollment relations
    const relations = await ctx.db
      .query("classroomStudentsRelations")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .filter((q) => q.eq(q.field("status"), "approved"))
      .collect();

    // Get classrooms from relations
    const classrooms = await Promise.all(
      relations.map((relation) => ctx.db.get(relation.classroomId)),
    );

    return classrooms.filter((c) => c !== null);
  },
});

export const getAvailableToEnroll = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return [];
    }

    // Get all classrooms
    const allClassrooms = await ctx.db.query("classrooms").collect();

    // Get user's relations (any status)
    const relations = await ctx.db
      .query("classroomStudentsRelations")
      .withIndex("by_student", (q) => q.eq("studentId", user._id))
      .collect();

    const enrolledClassroomIds = relations.map((r) => r.classroomId);

    // Filter out classrooms user is already related to
    const availableClassrooms = allClassrooms.filter(
      (classroom) => !enrolledClassroomIds.includes(classroom._id),
    );

    return availableClassrooms;
  },
});

export const enroll = mutation({
  args: {
    classroomId: v.id("classrooms"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check if already has a relation
    const existingRelation = await ctx.db
      .query("classroomStudentsRelations")
      .withIndex("by_student_classroom", (q) =>
        q.eq("studentId", user._id).eq("classroomId", args.classroomId),
      )
      .first();

    if (existingRelation) {
      throw new Error("Already enrolled in this classroom");
    }

    // Get classroom to check if approval is required
    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    // Create enrollment relation
    await ctx.db.insert("classroomStudentsRelations", {
      classroomId: args.classroomId,
      studentId: user._id,
      status: classroom.enrollmentRequiresApproval ? "pending" : "approved",
      enrolledAt: Date.now(),
    });

    // Create notification for teacher if approval required
    if (classroom.enrollmentRequiresApproval) {
      await ctx.db.insert("notifications", {
        userId: classroom.ownerId,
        type: "enrollment_request",
        title: "New Enrollment Request",
        message: `A student has requested to enroll in ${classroom.className}`,
        read: false,
        metadata: {
          classroomId: args.classroomId,
          studentId: user._id,
        },
        createdAt: Date.now(),
      });
    }
  },
});
