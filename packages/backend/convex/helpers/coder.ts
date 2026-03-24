import {
  activateUserAccount,
  createWorkspaceBuild,
  getWorkspaceMetadataByUserAndWorkspaceName,
} from "@package/coder-sdk";
import type { Client } from "@package/coder-sdk/client";

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 120_000;

/**
 * Ensures a Coder user account is in the "active" state.
 * Coder marks accounts as dormant after a period of inactivity and also
 * defaults new users to dormant. Since our app abstracts Coder away from
 * end-users, we must always activate accounts before interacting with them.
 */
export async function ensureUserActive(opts: {
  client: Client;
  userId: string;
}) {
  const resp = await activateUserAccount({
    client: opts.client,
    path: { user: opts.userId },
  });

  if (resp.error) {
    throw new Error(
      `Failed to activate Coder user account: ${JSON.stringify(resp.error)}`,
    );
  }
}

/**
 * Starts a Coder workspace if it isn't running and polls until the agent
 * is connected and ready. Returns the (possibly refreshed) workspace metadata.
 */
export async function ensureWorkspaceRunning(opts: {
  client: Client;
  userId: string;
  workspaceName: string;
  workspaceId: string;
  currentStatus: string | undefined;
}) {
  const { client, userId, workspaceName, workspaceId, currentStatus } = opts;

  if (
    currentStatus === "stopped" ||
    currentStatus === "failed" ||
    currentStatus === "pending"
  ) {
    const startResult = await createWorkspaceBuild({
      client,
      path: { workspace: workspaceId },
      body: { transition: "start" },
    });
    if (startResult.error) {
      throw new Error(
        `Failed to start workspace: ${JSON.stringify(startResult.error)}`,
      );
    }
  }

  if (currentStatus === "running") {
    return;
  }

  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT_MS) {
    const poll = await getWorkspaceMetadataByUserAndWorkspaceName({
      client,
      path: { user: userId, workspacename: workspaceName },
    });

    if (poll.error || !poll.data) {
      throw new Error("Failed to poll workspace status");
    }

    const buildStatus = poll.data.latest_build?.status;

    if (buildStatus === "failed" || buildStatus === "canceled") {
      throw new Error(
        `Workspace build entered terminal state: ${buildStatus}`,
      );
    }

    if (buildStatus === "running") {
      const agents =
        poll.data.latest_build?.resources?.flatMap((r) => r.agents ?? []) ?? [];

      const hasReadyAgent = agents.some(
        (a) => a.status === "connected" && a.lifecycle_state === "ready",
      );
      const hasAgentError = agents.some(
        (a) =>
          a.lifecycle_state === "start_error" ||
          a.lifecycle_state === "start_timeout",
      );

      if (hasReadyAgent) {
        return;
      }
      if (hasAgentError) {
        throw new Error("Workspace agent failed to start");
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("Workspace did not become ready within 2 minutes");
}
