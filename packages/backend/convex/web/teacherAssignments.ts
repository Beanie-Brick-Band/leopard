import { v } from "convex/values";

import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

// Get assignments for a classroom
export const getAssignmentsByClassroom = query({
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

    // Check if user has access (owner or enrolled student)
    const isOwner = classroom.ownerId === user._id;
    const isStudent = await ctx.db
      .query("classroomStudentsRelations")
      .withIndex("by_student_classroom", (q) =>
        q.eq("studentId", user._id).eq("classroomId", args.classroomId),
      )
      .filter((q) => q.eq(q.field("status"), "approved"))
      .first();

    if (!isOwner && !isStudent) {
      throw new Error("Not authorized to view assignments");
    }

    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_classroom", (q) => q.eq("classroomId", args.classroomId))
      .collect();

    return assignments;
  },
});

// Create a new assignment
export const createAssignment = mutation({
  args: {
    classroomId: v.id("classrooms"),
    name: v.string(),
    description: v.string(),
    dueDate: v.string(),
    templateId: v.optional(v.string()),
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
      throw new Error("Not authorized to create assignments");
    }

    const assignmentId = await ctx.db.insert("assignments", {
      classroomId: args.classroomId,
      name: args.name,
      description: args.description,
      dueDate: args.dueDate,
      templateId: args.templateId,
      createdAt: Date.now(),
    });

    // Notify all enrolled students
    const relations = await ctx.db
      .query("classroomStudentsRelations")
      .withIndex("by_classroom", (q) => q.eq("classroomId", args.classroomId))
      .filter((q) => q.eq(q.field("status"), "approved"))
      .collect();

    for (const relation of relations) {
      await ctx.db.insert("notifications", {
        userId: relation.studentId,
        type: "assignment_created",
        title: "New Assignment",
        message: `New assignment "${args.name}" in ${classroom.className}`,
        read: false,
        metadata: {
          classroomId: args.classroomId,
          assignmentId,
        },
        createdAt: Date.now(),
      });
    }

    return assignmentId;
  },
});

// Update an assignment
export const updateAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    templateId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    const assignment = await ctx.db.get(args.assignmentId);

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const classroom = await ctx.db.get(assignment.classroomId);

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.ownerId !== user._id) {
      throw new Error("Not authorized to update this assignment");
    }

    const updates: Partial<typeof assignment> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.templateId !== undefined) updates.templateId = args.templateId;

    await ctx.db.patch(args.assignmentId, updates);
  },
});

// Delete an assignment
export const deleteAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    const assignment = await ctx.db.get(args.assignmentId);

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const classroom = await ctx.db.get(assignment.classroomId);

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.ownerId !== user._id) {
      throw new Error("Not authorized to delete this assignment");
    }

    // Delete all submissions for this assignment
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) =>
        q.eq("assignmentId", args.assignmentId),
      )
      .collect();

    for (const submission of submissions) {
      // Delete flags associated with submission
      const flags = await ctx.db
        .query("flags")
        .withIndex("by_submission", (q) => q.eq("submissionId", submission._id))
        .collect();

      for (const flag of flags) {
        await ctx.db.delete(flag._id);
      }

      await ctx.db.delete(submission._id);
    }

    await ctx.db.delete(args.assignmentId);
  },
});

// Get submissions for an assignment (teacher view)
export const getSubmissionsByAssignment = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    const assignment = await ctx.db.get(args.assignmentId);

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const classroom = await ctx.db.get(assignment.classroomId);

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.ownerId !== user._id) {
      throw new Error("Not authorized to view submissions");
    }

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_assignment", (q) =>
        q.eq("assignmentId", args.assignmentId),
      )
      .collect();

    return submissions;
  },
});

// Grade a submission
export const gradeSubmission = mutation({
  args: {
    submissionId: v.id("submissions"),
    grade: v.float64(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    const submission = await ctx.db.get(args.submissionId);

    if (!submission) {
      throw new Error("Submission not found");
    }

    const assignment = await ctx.db.get(submission.assignmentId);

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const classroom = await ctx.db.get(assignment.classroomId);

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.ownerId !== user._id) {
      throw new Error("Not authorized to grade this submission");
    }

    await ctx.db.patch(args.submissionId, {
      grade: args.grade,
      feedback: args.feedback,
      gradedAt: Date.now(),
      gradedBy: user._id,
    });

    // Notify student
    await ctx.db.insert("notifications", {
      userId: submission.studentId,
      type: "assignment_graded",
      title: "Assignment Graded",
      message: `Your submission for "${assignment.name}" has been graded`,
      read: false,
      metadata: {
        assignmentId: assignment._id,
        submissionId: args.submissionId,
        grade: args.grade,
      },
      createdAt: Date.now(),
    });
  },
});

// Create a flag for suspicious work
export const createFlag = mutation({
  args: {
    submissionId: v.id("submissions"),
    type: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    const submission = await ctx.db.get(args.submissionId);

    if (!submission) {
      throw new Error("Submission not found");
    }

    const assignment = await ctx.db.get(submission.assignmentId);

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const classroom = await ctx.db.get(assignment.classroomId);

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.ownerId !== user._id) {
      throw new Error("Not authorized to flag this submission");
    }

    const flagId = await ctx.db.insert("flags", {
      submissionId: args.submissionId,
      type: args.type,
      description: args.description,
      timestamp: Date.now(),
      flaggedBy: user._id,
    });

    return flagId;
  },
});

// Get flags for a submission
export const getFlagsBySubmission = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    const submission = await ctx.db.get(args.submissionId);

    if (!submission) {
      throw new Error("Submission not found");
    }

    const assignment = await ctx.db.get(submission.assignmentId);

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const classroom = await ctx.db.get(assignment.classroomId);

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    // Only teacher can view flags
    if (classroom.ownerId !== user._id) {
      throw new Error("Not authorized to view flags");
    }

    const flags = await ctx.db
      .query("flags")
      .withIndex("by_submission", (q) =>
        q.eq("submissionId", args.submissionId),
      )
      .collect();

    return flags;
  },
});

// Delete a flag
export const deleteFlag = mutation({
  args: {
    flagId: v.id("flags"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("Not authenticated");
    }

    const flag = await ctx.db.get(args.flagId);

    if (!flag) {
      throw new Error("Flag not found");
    }

    const submission = await ctx.db.get(flag.submissionId);

    if (!submission) {
      throw new Error("Submission not found");
    }

    const assignment = await ctx.db.get(submission.assignmentId);

    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const classroom = await ctx.db.get(assignment.classroomId);

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    if (classroom.ownerId !== user._id) {
      throw new Error("Not authorized to delete this flag");
    }

    await ctx.db.delete(args.flagId);
  },
});
