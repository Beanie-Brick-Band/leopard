"use node";

import { v } from "convex/values";

import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { authComponent } from "../auth";
import {
  deleteObject,
  generateUploadUrl,
  getObjectKey,
} from "../helpers/minio";

// Internal action: delete the MinIO object (for scheduled cleanup)
export const internalDeleteStarterCodeObject = internalAction({
  args: { storageKey: v.string() },
  handler: async (_ctx, args) => {
    await deleteObject(args.storageKey);
  },
});

export const getStarterCodeUploadUrl = action({
  args: {
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Verify instructor access and get assignment data
    const assignment = await ctx.runQuery(
      internal.web.teacherAssignments.internalGetAssignmentForInstructor,
      { assignmentId: args.assignmentId, userId: user._id },
    );

    const key = getObjectKey(
      assignment.classroomId,
      args.assignmentId,
    );
    const uploadUrl = await generateUploadUrl(key);

    return { uploadUrl, storageKey: key };
  },
});

export const removeStarterCode = action({
  args: {
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const assignment = await ctx.runQuery(
      internal.web.teacherAssignments.internalGetAssignmentForInstructor,
      { assignmentId: args.assignmentId, userId: user._id },
    );

    if (assignment?.starterCodeStorageKey) {
      await deleteObject(assignment.starterCodeStorageKey);
    }

    await ctx.runMutation(
      internal.web.teacherAssignments.internalClearStarterCodeKey,
      { assignmentId: args.assignmentId },
    );
  },
});
