"use server";

import { cookies } from "next/headers";
import { fetchAction } from "convex/nextjs";

import type { Id } from "@package/backend/convex/_generated/dataModel";
import { api } from "@package/backend/convex/_generated/api";

import { env } from "~/env";
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

  // Check if we're in development mode
  // Next.js automatically sets NODE_ENV to 'development' when running `next dev`
  const isDevelopment = env.NODE_ENV === "development";

  // TODO: artificially wait for 15 seconds to ensure the workspace is up
  await new Promise((resolve) => setTimeout(resolve, 15000));

  // In development, redirect through an intermediate endpoint that sets the cookie
  // The reverse proxy (@package/dev-proxy) serves this page and handles the flow
  // In production, set cookie and redirect directly
  if (isDevelopment) {
    // Extract the workspace path from the Coder URL
    const url = new URL(result.workspaceUrl);
    const coderUrl = `http://coder.localhost${url.pathname}${url.search}${url.hash}`;

    // Redirect to intermediate endpoint that will set the cookie on coder.localhost domain
    // This page is served by nginx from packages/dev-proxy/set-coder-cookie.html
    // then redirect to the actual workspace
    const intermediateUrl = `http://coder.localhost/set-cookie.html?token=${encodeURIComponent(result.coderUserSessionKey)}&redirect=${encodeURIComponent(coderUrl)}`;

    return intermediateUrl;
  }

  // Production flow: set cookie and redirect directly
  const cookieStore = await cookies();
  cookieStore.set({
    name: "coder_session_token",
    value: result.coderUserSessionKey,
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    domain: ".nolapse.tech",
  });

  return result.workspaceUrl;
}
