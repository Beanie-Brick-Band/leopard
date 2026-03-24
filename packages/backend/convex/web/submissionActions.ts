"use node";

import { v } from "convex/values";
import { z } from "zod";

import {
  createNewSessionKey,
  createWorkspaceBuild,
  getWorkspaceMetadataByUserAndWorkspaceName,
} from "@package/coder-sdk";
import { createClient } from "@package/coder-sdk/client";

import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { authComponent } from "../auth";
import { ensureWorkspaceRunning } from "../helpers/coder";
import {
  generateDownloadUrl,
  generateUploadUrl,
  verifyObjectExists,
} from "../helpers/minio";
import { getSubmissionObjectKey } from "../helpers/storageKeys";

const sidecarResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callSidecar(
  userSessionToken: string,
  ownerUsername: string,
  workspaceName: string,
  uploadUrl: string,
): Promise<{ success: boolean; error?: string }> {
  const sidecarUrl = `${new URL(process.env.CODER_API_URL!).origin}/@${ownerUsername}/${workspaceName}.main/apps/submit-sidecar/submit`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(sidecarUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Coder-Session-Token": userSessionToken,
        },
        body: JSON.stringify({ uploadUrl }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Sidecar HTTP ${res.status}: ${text}`);
      }

      const result = sidecarResponseSchema.parse(await res.json());
      if (result.success) {
        return { success: true };
      }
      throw new Error(result.error || "Sidecar returned failure");
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        return { success: false, error: (err as Error).message };
      }
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  return { success: false, error: "Max retries exceeded" };
}

export const triggerSubmission = action({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args): Promise<{ success: boolean; submissionId: Id<"submissions"> }> => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get workspace for this specific assignment
    const workspace = await ctx.runQuery(
      internal.web.assignment.getWorkspaceByAssignment,
      {
        userId: user._id,
        assignmentId: args.assignmentId,
      },
    );
    if (!workspace) {
      throw new Error(
        "You have never launched a workspace for this assignment. No work to be submitted.",
      );
    }

    // Validate and create/update submission (checks role, enrollment, due date, duplicates)
    const submissionId = await ctx.runMutation(
      internal.web.submission.internalSubmitAssignment,
      {
        assignmentId: args.assignmentId,
        studentId: user._id,
        workspaceId: workspace._id,
      },
    );

    // Look up classroom for storage key
    const assignment = await ctx.runQuery(
      internal.web.submissionQueries.getAssignment,
      { assignmentId: args.assignmentId },
    );
    if (!assignment) {
      await ctx.runMutation(internal.web.submission.internalFailSubmission, {
        submissionId,
      });
      throw new Error("Assignment not found");
    }

    // Get Coder workspace details
    const coderClient = createClient({
      baseUrl: process.env.CODER_API_URL!,
      auth: process.env.CODER_API_KEY!,
    });

    const coderUserId = user._id.toString();
    const workspaceMeta = await getWorkspaceMetadataByUserAndWorkspaceName({
      client: coderClient,
      path: {
        user: coderUserId,
        workspacename: args.assignmentId.toString(),
      },
    });

    if (workspaceMeta.error || !workspaceMeta.data) {
      await ctx.runMutation(internal.web.submission.internalFailSubmission, {
        submissionId,
      });
      throw new Error("Could not find Coder workspace");
    }

    try {
      await ensureWorkspaceRunning({
        client: coderClient,
        userId: coderUserId,
        workspaceName: args.assignmentId.toString(),
        workspaceId: workspaceMeta.data.id!,
        currentStatus: workspaceMeta.data.latest_build?.status,
      });
    } catch (err) {
      await ctx.runMutation(internal.web.submission.internalFailSubmission, {
        submissionId,
      });
      throw err;
    }

    await ctx.runMutation(internal.web.assignment.ensureWorkspaceActive, {
      userId: coderUserId,
      coderWorkspaceId: workspaceMeta.data.id!,
      assignmentId: args.assignmentId,
    });

    // Generate presigned upload URL
    const storageKey = getSubmissionObjectKey(
      assignment.classroomId,
      args.assignmentId,
      user._id,
    );
    let uploadUrl: string;
    try {
      uploadUrl = await generateUploadUrl(storageKey);
    } catch (err) {
      await ctx.runMutation(internal.web.submission.internalFailSubmission, {
        submissionId,
      });
      throw err;
    }

    // Create a session token for the workspace owner so we can access the path-based app
    const userSession = await createNewSessionKey({
      client: coderClient,
      path: { user: coderUserId },
    });
    if (userSession.error || !userSession.data?.key) {
      await ctx.runMutation(internal.web.submission.internalFailSubmission, {
        submissionId,
      });
      throw new Error("Failed to create Coder session token for submission");
    }

    // Call sidecar
    const sidecarResult = await callSidecar(
      userSession.data.key,
      coderUserId,
      args.assignmentId.toString(),
      uploadUrl,
    );

    if (!sidecarResult.success) {
      await ctx.runMutation(internal.web.submission.internalFailSubmission, {
        submissionId,
      });
      throw new Error(`Submission failed: ${sidecarResult.error}`);
    }

    // Verify file exists in MinIO
    const exists = await verifyObjectExists(storageKey);
    if (!exists) {
      await ctx.runMutation(internal.web.submission.internalFailSubmission, {
        submissionId,
      });
      throw new Error("Upload verification failed — file not found in storage");
    }

    // Confirm submission
    await ctx.runMutation(internal.web.submission.internalConfirmSubmission, {
      submissionId,
      submissionStorageKey: storageKey,
    });

    // Stop workspace via Coder API
    try {
      if (workspaceMeta.data.id) {
        await createWorkspaceBuild({
          client: coderClient,
          path: { workspace: workspaceMeta.data.id },
          body: { transition: "stop" },
        });
      }
    } catch (error) {
      // Log error but continue with deactivation
    }

    // Deactivate workspace in DB
    await ctx.runMutation(internal.web.assignment.deactivateWorkspace, {
      workspaceId: workspace._id,
    });

    return { success: true, submissionId };
  },
});

export const getSubmissionDownloadUrl = action({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const submission = await ctx.runQuery(
      internal.web.submissionQueries.getSubmissionForDownload,
      { submissionId: args.submissionId, userId: user._id },
    );

    if (!submission) {
      throw new Error("Submission not found");
    }

    if (!submission.submissionStorageKey) {
      throw new Error("No submission file available for download");
    }

    const downloadUrl = await generateDownloadUrl(
      submission.submissionStorageKey,
    );
    return { downloadUrl };
  },
});
