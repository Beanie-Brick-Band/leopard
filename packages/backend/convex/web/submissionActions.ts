"use node";

import { v } from "convex/values";

import {
  createNewSessionKey,
  createWorkspaceBuild,
  getWorkspaceMetadataByUserAndWorkspaceName,
} from "@package/coder-sdk";
import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { internal as _internal } from "../_generated/api";
import { action } from "../_generated/server";
import { authComponent } from "../auth";
import { getCoderClient, getCoderOrigin } from "../helpers/coder";
import {
  generateDownloadUrl,
  generateUploadUrl,
  verifyObjectExists,
} from "../helpers/minio";
import { getSubmissionObjectKey } from "../helpers/storageKeys";

// The `internal` type may not resolve correctly in all TS project configs (e.g.
// vscode-extension tsc) due to circular _generated/api.d.ts resolution, so we
// cast to `any` and use this alias throughout the file instead.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
const internal: any = _internal;

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
  const sidecarUrl = `${getCoderOrigin()}/@${ownerUsername}/${workspaceName}.main/apps/submit-sidecar/submit`;

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
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Verify student role
    const userRecord = await ctx.runQuery(
      internal.web.submissionQueries.getUserRecord,
      {
        userId: user._id,
      },
    );
    if (userRecord?.role && userRecord.role !== "student") {
      throw new Error("Only students can submit assignments");
    }

    // Get assignment + classroom
    const assignment = await ctx.runQuery(
      internal.web.submissionQueries.getAssignment,
      {
        assignmentId: args.assignmentId,
      },
    );
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    const classroom = await ctx.runQuery(
      internal.web.submissionQueries.getClassroom,
      {
        classroomId: assignment.classroomId,
      },
    );
    if (!classroom) {
      throw new Error("Classroom not found");
    }

    // Verify enrollment
    const isEnrolled = await ctx.runQuery(
      internal.web.submissionQueries.checkEnrollment,
      {
        studentId: user._id,
        classroomId: classroom._id,
      },
    );
    if (!isEnrolled) {
      throw new Error("Not enrolled in this classroom");
    }

    // Check deadline
    if (Date.now() > assignment.dueDate) {
      throw new Error("Cannot submit after the due date");
    }

    // Check no existing confirmed submission
    const existingSubmission = await ctx.runQuery(
      internal.web.submissionQueries.getStudentSubmission,
      { studentId: user._id, assignmentId: args.assignmentId },
    );
    if (existingSubmission?.status === "confirmed") {
      throw new Error("Assignment already submitted");
    }

    // Get active workspace
    const workspace = await ctx.runQuery(
      internal.web.assignment.getUserActiveWorkspace,
      {
        userId: user._id,
      },
    );
    if (!workspace) {
      throw new Error("No active workspace found. Launch a workspace first.");
    }
    if (workspace.assignmentId !== args.assignmentId) {
      throw new Error(
        "Active workspace is not linked to this assignment. Launch the correct workspace first.",
      );
    }

    // Get Coder workspace details
    const coderClient = getCoderClient();

    const coderUserId = user._id.toString();
    const workspaceMeta = await getWorkspaceMetadataByUserAndWorkspaceName({
      client: coderClient,
      path: {
        user: coderUserId,
        workspacename: args.assignmentId.toString(),
      },
    });

    if (workspaceMeta.error || !workspaceMeta.data) {
      throw new Error("Could not find Coder workspace");
    }

    // Generate presigned upload URL
    const storageKey = getSubmissionObjectKey(
      classroom._id,
      args.assignmentId,
      user._id,
    );
    const uploadUrl = await generateUploadUrl(storageKey);

    // Set submission to uploading
    const submissionId = await ctx.runMutation(
      internal.web.submission.internalSetSubmissionUploading,
      {
        assignmentId: args.assignmentId,
        studentId: user._id,
        workspaceId: workspace._id,
      },
    );

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
      throw new Error(
        "Upload verification failed — file not found in storage",
      );
    }

    // Confirm submission
    await ctx.runMutation(internal.web.submission.internalConfirmSubmission, {
      submissionId,
      submissionStorageKey: storageKey,
    });

    // Stop workspace via Coder API
    if (workspaceMeta.data.id) {
      await createWorkspaceBuild({
        client: coderClient,
        path: { workspace: workspaceMeta.data.id },
        body: { transition: "stop" },
      });
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
