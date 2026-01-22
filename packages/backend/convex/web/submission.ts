import { v } from "convex/values";

import { mutation, query, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";
import { Id } from "../_generated/dataModel";   

const checkGraderAccess = async (uid: string,  ctx: QueryCtx, assignmentId: Id<"assignments">) => {
    const assignment = await ctx.db.get(assignmentId);
    if (!assignment) {
        throw new Error("Assignment not found");
    }
    const classroom = await ctx.db.get(assignment.classroomId);
    if (!classroom) {
        throw new Error("Classroom not found");
    }
    if (!(classroom.ownerId === uid || classroom.assistantIds.includes(uid))) {
        throw new Error("Insufficient permissions to provide feedback on this submission");
    }
}

const checkAuth = async (ctx: QueryCtx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
        throw new Error("Not authenticated");
    }
    return user
}

export const submitAssignment = mutation({
    args: {
        assignmentId: v.id("assignments"),
        workspaceId: v.id("workspaces"),
    },
    handler: async (ctx, args) => {
        const user = await checkAuth(ctx);

        // check assignment exists
        const assignment = await ctx.db.get(args.assignmentId);
        if (!assignment) {
            throw new Error("Assignment not found");
        }

        // Check if user is enrolled in the classroom
        const classroomId = assignment.classroomId;
        const relation = await ctx.db
            .query("classroomStudentsRelations")
            .withIndex("studentId_classroomId", (q) =>
                q.eq("studentId", user._id).eq("classroomId", classroomId),
            )
            .first();

        if (!relation) {
            throw new Error("User not enrolled in the classroom");
        }

        //Due date check
        const currentTime = Date.now();
        if (currentTime > assignment.dueDate) {
            throw new Error("Cannot submit after the due date");
        }

        // Check if submission already exists
        const existingSubmission = await ctx.db
        .query("submissions")
        .withIndex("studentId_assignmentId", q =>
            q.eq("studentId", user._id).eq("assignmentId", args.assignmentId)
        )
        .first();

        if (existingSubmission) {
            await ctx.db.patch(existingSubmission._id, {
                workspaceId: args.workspaceId,
                submittedAt: Date.now(),
            });
            return { submissionId: existingSubmission._id };
        }

        // New submission
        const submissionId = await ctx.db.insert("submissions", {
            assignmentId: args.assignmentId,
            flags: [],
            studentId: user._id,
            workspaceId: args.workspaceId,
            submittedAt: Date.now(),
            gradesReleased: false,
        });

        return { submissionId };

}});

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
}});

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
}});

export const getOwnSubmissionsForAssignment = query({
    args: {
        assignmentId: v.id("assignments"),
    },
    handler: async (ctx, args) => {
        const user = await checkAuth(ctx);

        const submission = await ctx.db
        .query("submissions")
        .withIndex("studentId_assignmentId", q =>
            q.eq("studentId", user._id).eq("assignmentId", args.assignmentId)
        )
        .first();

        if (!submission){
            return {success: false}
        }

        if (submission.gradesReleased){
            return {success: true, submission: submission}
        }

        const publicSubmissionInfo = {
            _id: submission._id,
            workspaceId: submission.workspaceId,
            studentId: submission.studentId,
            assignmentId: submission.assignmentId,
            submittedAt: submission.submittedAt,
            gradesReleased: submission.gradesReleased
        }

        return {success: true, submission: publicSubmissionInfo};
    }});

export const getAllSubmissionsForAssignment = query({
    args: {
        assignmentId: v.id("assignments"),
    },
    handler: async (ctx, args) => {
        const user = await checkAuth(ctx);

        await checkGraderAccess(user._id, ctx, args.assignmentId);

        const submissions = await ctx.db
        .query("submissions")
        .withIndex("assignmentId_studentId", q =>
            q.eq("assignmentId", args.assignmentId)
        )
        .collect();
        return submissions;
}});


