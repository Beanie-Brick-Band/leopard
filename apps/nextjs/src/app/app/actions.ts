"use server";

import { fetchAction } from "convex/nextjs";

import type { Id } from "@package/backend/convex/_generated/dataModel";
import { api } from "@package/backend/convex/_generated/api";

import { getToken } from "~/lib/auth-server";

export async function submitWorkspace(assignmentId: Id<"assignments">) {
  const token = await getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  await fetchAction(
    api.web.submissionActions.triggerE2BSubmission,
    { assignmentId },
    { token },
  );
}

export async function getSubmissionDownload(submissionId: Id<"submissions">) {
  const token = await getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  return fetchAction(
    api.web.submissionActions.getSubmissionDownloadUrl,
    { submissionId },
    { token },
  );
}

export async function launchWorkspace(assignmentId: Id<"assignments">) {
  const token = await getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const result = await fetchAction(
    api.web.assignmentActions.launchE2BWorkspace,
    { assignmentId },
    { token },
  );

  return result.workspaceUrl;
}
