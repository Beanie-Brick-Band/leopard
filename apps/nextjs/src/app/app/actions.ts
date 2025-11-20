"use server";

import { cookies } from "next/headers";
import { fetchAction } from "convex/nextjs";

import type { Id } from "@package/backend/convex/_generated/dataModel";
import { api } from "@package/backend/convex/_generated/api";

import { getToken } from "~/lib/auth-server";

export async function launchWorkspace(assignmentId: Id<"assignments">) {
  const token = await getToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const result = await fetchAction(
    api.web.assignment.launchWorkspace,
    {
      assignmentId: assignmentId,
    },
    { token },
  );

  const cookieStore = await cookies();

  cookieStore.set({
    name: "coder_session_token",
    value: result.coderUserSessionKey,
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    domain: ".nolapse.tech", // TODO: Make this automatically derived
  });

  // TODO: artificially wait for 15 seconds to ensure the workspace is up
  await new Promise((resolve) => setTimeout(resolve, 15000));

  return result.workspaceUrl;
}
