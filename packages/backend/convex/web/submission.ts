import { v } from "convex/values";

import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

export const createSubmissionEntries = mutation({
  args: {
    assignmentId: v.id("assignments"),
  },
    handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Check if user is teacher or assistant for the classroom
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }
    const classroomId = assignment.classroomId;
    const classroom = await ctx.db.get(classroomId);

    if (!classroom) {
        throw new Error("Classroom not found");
    }

    if (!(classroom.ownerId === user._id || classroom.assistantIds.includes(user._id))) {
        throw new Error("Insufficient permissions for this classroom");
    }

    // Get all students in the classroom
    const relations = await ctx.db
    .query("classroomStudentsRelations")
      .withIndex("classroomId_studentId", (q) => q.eq("classroomId", classroomId))
      .collect();

    const existingSubmissions = await ctx.db
    .query("submissions")
      .withIndex("assignmentId_studentId", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    const existingStudentIds = new Set(existingSubmissions.map(s => s.studentId));

    const inserts = [];
    // Create a submission entry for all students in the classroom
    for (const relation of relations) {
        if (existingStudentIds.has(relation.studentId)) continue;

        inserts.push(
            ctx.db.insert("submissions", {
            assignmentId: args.assignmentId,
            flags: [],
            studentId: relation.studentId,
            submitted: false,
        }));
    }
    await Promise.all(inserts);

    return { 
        created: inserts.length,
        total: relations.length,
        skipped: relations.length - inserts.length
     };
}
});

export const submitAssignment = mutation({
    args: {
        assignmentId: v.id("assignments"),
        workspaceId: v.id("workspaces"),
    },
    handler: async (ctx, args) => {
        const user = await authComponent.getAuthUser(ctx);
        if (!user) {
            throw new Error("Not authenticated");
        }

    let submission = null;

    try {
    submission = await ctx.db
        .query("submissions")
        .withIndex("assignmentId_studentId", q =>
        q.eq("assignmentId", args.assignmentId)
        .eq("studentId", user._id)
        )
        .unique();
    } catch (err) {
    // Multiple rows matched — invariant broken
    console.error("Duplicate submissions detected", {
        assignmentId: args.assignmentId,
        studentId: user._id,
    });

    throw new Error(
        "Data integrity error: multiple submissions found. Please contact support."
    );
    }

    if (!submission) {
        throw new Error("Submission entry not found for this assignment and user");
    }

    await ctx.db.patch(submission._id, {
        workspaceId: args.workspaceId,
        submitted: true,
        submissionDate: new Date().toISOString(),
    });

    return {submissionId: submission._id};
}});

export const gradeSubmission = mutation({
    args: {
        submissionId: v.id("submissions"),
        grade: v.float64(),
    },
    handler: async (ctx, args) => {
        const user = await authComponent.getAuthUser(ctx);
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
        if (!(classroom.ownerId === user._id || classroom.assistantIds.includes(user._id))) {
            throw new Error("Insufficient permissions to grade this submission");
        }
        await ctx.db.patch(args.submissionId, {
            grade: args.grade,
        });

        return { success: true };
}});

export const provideSubmissionFeedback = mutation({
    args: {
        submissionId: v.id("submissions"),
        feedback: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await authComponent.getAuthUser(ctx);
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
        if (!(classroom.ownerId === user._id || classroom.assistantIds.includes(user._id))) {
            throw new Error("Insufficient permissions to provide feedback on this submission");
        }
        await ctx.db.patch(args.submissionId, {
            submissionFeedback: args.feedback,
        });
        return { success: true };
}});

export const getSubmissionsForAssignment = query({
    args: {
        assignmentId: v.id("assignments"),
    },
    handler: async (ctx, args) => {
        const user = await authComponent.getAuthUser(ctx);
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
        if (!(classroom.ownerId === user._id || classroom.assistantIds.includes(user._id))) {
            throw new Error("Insufficient permissions to view submissions for this assignment");
        }
        const submissions = await ctx.db
        .query("submissions")
        .withIndex("assignmentId_studentId", q =>
            q.eq("assignmentId", args.assignmentId)
        )
        .collect();
        return submissions;
}});


