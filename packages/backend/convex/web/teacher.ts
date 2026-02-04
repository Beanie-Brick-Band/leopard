import { v } from "convex/values";

import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// Get classrooms owned by the teacher
export const getMyClassrooms = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return [];
    }

    const classrooms = await ctx.db
      .query("classrooms")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();

    return classrooms;
  },
});

// Get a single classroom with details
export const getClassroomDetails = query({
  args: { classroomId: v.id("classrooms") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    const classroom = await ctx.db.get(args.classroomId);

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    // Check if user is the owner
    if (classroom.ownerId !== user._id) {
      throw new Error("Not authorized to view this classroom");
    }

    // Get assignments
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_classroom", (q) => q.eq("classroomId", args.classroomId))
      .collect();

    // Get student relations
    const relations = await ctx.db
      .query("classroomStudentsRelations")
      .withIndex("by_classroom", (q) => q.eq("classroomId", args.classroomId))
      .collect();

    return {
      classroom,
      assignments,
      studentCount: relations.filter((r) => r.status === "approved").length,
      pendingEnrollments: relations.filter((r) => r.status === "pending")
        .length,
    };
  },
});

// Get pending enrollment requests for a classroom
export const getPendingEnrollments = query({
  args: { classroomId: v.id("classrooms") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    const classroom = await ctx.db.get(args.classroomId);

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.ownerId !== user._id) {
      throw new Error("Not authorized");
    }

    const pendingRelations = await ctx.db
      .query("classroomStudentsRelations")
      .withIndex("by_classroom", (q) => q.eq("classroomId", args.classroomId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return pendingRelations;
  },
});

// Get enrolled students for a classroom
export const getEnrolledStudents = query({
  args: { classroomId: v.id("classrooms") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    const classroom = await ctx.db.get(args.classroomId);

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.ownerId !== user._id) {
      throw new Error("Not authorized");
    }

    const approvedRelations = await ctx.db
      .query("classroomStudentsRelations")
      .withIndex("by_classroom", (q) => q.eq("classroomId", args.classroomId))
      .filter((q) => q.eq(q.field("status"), "approved"))
      .collect();

    return approvedRelations;
  },
});

// Create a new classroom
export const createClassroom = mutation({
  args: {
    className: v.string(),
    description: v.string(),
    enrollmentRequiresApproval: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    // Check if user is a teacher
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!profile || profile.role !== "teacher") {
      throw new Error("Only teachers can create classrooms");
    }

    const classroomId = await ctx.db.insert("classrooms", {
      className: args.className,
      description: args.description,
      ownerId: user._id,
      createdAt: Date.now(),
      enrollmentRequiresApproval: args.enrollmentRequiresApproval,
    });

    return classroomId;
  },
});

// Update a classroom
export const updateClassroom = mutation({
  args: {
    classroomId: v.id("classrooms"),
    className: v.optional(v.string()),
    description: v.optional(v.string()),
    enrollmentRequiresApproval: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    const classroom = await ctx.db.get(args.classroomId);

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.ownerId !== user._id) {
      throw new Error("Not authorized to update this classroom");
    }

    const updates: Partial<typeof classroom> = {};
    if (args.className !== undefined) updates.className = args.className;
    if (args.description !== undefined) updates.description = args.description;
    if (args.enrollmentRequiresApproval !== undefined)
      updates.enrollmentRequiresApproval = args.enrollmentRequiresApproval;

    await ctx.db.patch(args.classroomId, updates);
  },
});

// Delete a classroom
export const deleteClassroom = mutation({
  args: {
    classroomId: v.id("classrooms"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    const classroom = await ctx.db.get(args.classroomId);

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.ownerId !== user._id) {
      throw new Error("Not authorized to delete this classroom");
    }

    // Delete all related data
    // 1. Delete classroom-student relations
    const relations = await ctx.db
      .query("classroomStudentsRelations")
      .withIndex("by_classroom", (q) => q.eq("classroomId", args.classroomId))
      .collect();

    for (const relation of relations) {
      await ctx.db.delete(relation._id);
    }

    // 2. Delete assignments (and their submissions)
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_classroom", (q) => q.eq("classroomId", args.classroomId))
      .collect();

    for (const assignment of assignments) {
      // Delete submissions for this assignment
      const submissions = await ctx.db
        .query("submissions")
        .withIndex("by_assignment", (q) => q.eq("assignmentId", assignment._id))
        .collect();

      for (const submission of submissions) {
        await ctx.db.delete(submission._id);
      }

      await ctx.db.delete(assignment._id);
    }

    // 3. Finally delete the classroom
    await ctx.db.delete(args.classroomId);
  },
});

// Approve or reject enrollment request
export const updateEnrollmentStatus = mutation({
  args: {
    relationId: v.id("classroomStudentsRelations"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    const relation = await ctx.db.get(args.relationId);

    if (!relation) {
      throw new Error("Enrollment relation not found");
    }

    const classroom = await ctx.db.get(relation.classroomId);

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.ownerId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.relationId, {
      status: args.status,
    });

    // Send notification to student
    await ctx.db.insert("notifications", {
      userId: relation.studentId,
      type: "enrollment_approved",
      title:
        args.status === "approved"
          ? "Enrollment Approved"
          : "Enrollment Rejected",
      message:
        args.status === "approved"
          ? `Your enrollment request for ${classroom.className} has been approved`
          : `Your enrollment request for ${classroom.className} has been rejected`,
      read: false,
      createdAt: Date.now(),
    });
  },
});

// Remove a student from a classroom
export const removeStudent = mutation({
  args: {
    relationId: v.id("classroomStudentsRelations"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    const relation = await ctx.db.get(args.relationId);

    if (!relation) {
      throw new Error("Enrollment relation not found");
    }

    const classroom = await ctx.db.get(relation.classroomId);

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.ownerId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.relationId);
  },
});
