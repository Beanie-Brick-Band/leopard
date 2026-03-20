"use node";

import { v } from "convex/values";

import {
  activateUserAccount,
  createNewSessionKey,
  createNewUser,
  createUserWorkspace,
  createWorkspaceBuild,
  getOrganizations,
  getTemplatesByOrganization,
  getUserByName,
  getWorkspaceMetadataByUserAndWorkspaceName,
  listWorkspaces,
} from "@package/coder-sdk";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { authComponent } from "../auth";
import { getCoderClient, getCoderOrigin } from "../helpers/coder";
import { generateDownloadUrl } from "../helpers/minio";

export const launchWorkspace = action({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const coderClient = getCoderClient();

    const coderUserId = user._id.toString();
    const sanitizedEmail = user.email.replace(/[^a-zA-Z0-9]/g, "-");

    const initalFetchUserReq = await getUserByName({
      client: coderClient,
      path: { user: coderUserId },
    });

    let userInCoder = initalFetchUserReq.data;

    if (!userInCoder) {
      // get organization id
      const orgsResp = await getOrganizations({ client: coderClient });
      if (orgsResp.error) {
        throw new Error(
          `Failed to fetch organizations from Coder: ${JSON.stringify(orgsResp.error)}`,
        );
      }
      const organizationId = orgsResp.data?.at(0)?.id;
      if (!organizationId) {
        throw new Error("No organizations found in Coder account");
      }

      const createUserResp = await createNewUser({
        client: coderClient,
        body: {
          username: coderUserId,
          email: `${sanitizedEmail}-${coderUserId}@internal.leopard.com`,
          organization_ids: [organizationId],
          login_type: "none",
          user_status: "active",
        },
      });

      if (createUserResp.error) {
        throw new Error(
          `Failed to create user in Coder: ${JSON.stringify(createUserResp.error)}`,
        );
      }

      userInCoder = (
        await getUserByName({
          client: coderClient,
          path: { user: coderUserId },
        })
      ).data;
    }

    if (!userInCoder) {
      throw new Error("Failed to create or fetch user in Coder");
    }

    // Activate the user account to ensure they're not dormant
    const activateResp = await activateUserAccount({
      client: coderClient,
      path: { user: coderUserId },
    });

    if (activateResp.error) {
      // Don't throw here - continue with workspace launch even if activation fails
    }

    // get templates
    const templatesResp = await getTemplatesByOrganization({
      client: coderClient,
      path: { organization: userInCoder.organization_ids![0]! }, // every user has at least 1 organization
    });

    if (templatesResp.error) {
      throw new Error(
        `Failed to fetch templates from Coder: ${JSON.stringify(templatesResp.error)}`,
      );
    }

    // get the workspace, if it doesnt exit then make it

    let workspaceMetadata = await getWorkspaceMetadataByUserAndWorkspaceName({
      client: coderClient,
      path: {
        user: coderUserId,
        workspacename: `${args.assignmentId.toString()}`,
      },
    });

    if (workspaceMetadata.error) {
      // Check for starter code
      const starterCodeKey = await ctx.runQuery(
        internal.web.assignment.internalGetAssignmentStarterCodeKey,
        { assignmentId: args.assignmentId },
      );

      const richParams: Array<{ name: string; value: string }> = [];
      if (starterCodeKey) {
        const downloadUrl = await generateDownloadUrl(starterCodeKey);
        richParams.push({
          name: "starter_code_url",
          value: downloadUrl,
        });
      }

      // create workspace
      await createUserWorkspace({
        client: coderClient,
        body: {
          name: `${args.assignmentId.toString()}`,
          template_id: templatesResp.data?.find(
            (t) => t.name === "kubernetes",
          )?.id,
          ttl_ms: 3600000,
          rich_parameter_values: richParams,
        },
        path: {
          user: coderUserId,
        },
      });
    }
    workspaceMetadata = await getWorkspaceMetadataByUserAndWorkspaceName({
      client: coderClient,
      path: {
        user: coderUserId,
        workspacename: `${args.assignmentId.toString()}`,
      },
    });

    if (workspaceMetadata.error || !workspaceMetadata.data) {
      throw new Error("Failed to fetch or create workspace metadata in Coder");
    }

    // start the workspace if it's not running
    const workspaceStatus = workspaceMetadata.data.latest_build?.status;
    const targetWorkspaceId = workspaceMetadata.data.id;

    if (
      workspaceStatus === "stopped" ||
      workspaceStatus === "failed" ||
      workspaceStatus === "pending"
    ) {
      const workspaceStart = await createWorkspaceBuild({
        client: coderClient,
        path: {
          workspace: targetWorkspaceId!,
        },
        body: {
          transition: "start",
        },
      });
      if (workspaceStart.error) {
        throw new Error(
          `Failed to start workspace: ${JSON.stringify(workspaceStart.error)}`,
        );
      }
    }

    // close all other workspaces for this user
    const workspaces = await listWorkspaces({
      client: coderClient,
      query: {
        q: `owner:${coderUserId}`,
      },
    });

    if (workspaces.error) {
      throw new Error(
        `Failed to list workspaces from Coder: ${JSON.stringify(workspaces.error)}`,
      );
    }

    for (const ws of workspaces.data?.workspaces ?? []) {
      // close it
      if (!ws.id) {
        continue;
      }
      if (ws.id === workspaceMetadata.data?.id) {
        continue;
      }

      // ws.id
      const workspaceStop = await createWorkspaceBuild({
        client: coderClient,
        path: {
          workspace: ws.id!,
        },
        body: {
          transition: "stop",
        },
      });
      if (workspaceStop.error) {
        // Failed to stop workspace, but continue with other workspaces
      }
    }

    const coderUserSessionKey = await createNewSessionKey({
      client: coderClient,
      path: {
        user: coderUserId,
      },
    });

    if (
      coderUserSessionKey.error ||
      !coderUserSessionKey.data ||
      !coderUserSessionKey.data.key
    ) {
      throw new Error("Failed to create session key in Coder");
    }

    // Poll until the workspace is ready (build running + agent connected & ready)
    const POLL_INTERVAL_MS = 2000;
    const TIMEOUT_MS = 120_000;
    const startTime = Date.now();

    while (Date.now() - startTime < TIMEOUT_MS) {
      const poll = await getWorkspaceMetadataByUserAndWorkspaceName({
        client: coderClient,
        path: {
          user: coderUserId,
          workspacename: `${args.assignmentId.toString()}`,
        },
      });

      if (poll.error || !poll.data) {
        throw new Error("Failed to poll workspace status");
      }

      const buildStatus = poll.data.latest_build?.status;

      // Fail fast on terminal error states
      if (buildStatus === "failed" || buildStatus === "canceled") {
        throw new Error(`Workspace build entered terminal state: ${buildStatus}`);
      }

      if (buildStatus === "running") {
        // Check if any agent is connected and ready
        const agents =
          poll.data.latest_build?.resources?.flatMap((r) => r.agents ?? []) ??
          [];

        const hasReadyAgent = agents.some(
          (a) => a.status === "connected" && a.lifecycle_state === "ready",
        );

        // Fail fast if an agent hit an error
        const hasAgentError = agents.some(
          (a) =>
            a.lifecycle_state === "start_error" ||
            a.lifecycle_state === "start_timeout",
        );

        if (hasReadyAgent) {
          break;
        }

        if (hasAgentError) {
          throw new Error("Workspace agent failed to start");
        }
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    if (Date.now() - startTime >= TIMEOUT_MS) {
      throw new Error("Workspace did not become ready within 2 minutes");
    }

    await ctx.runMutation(internal.web.assignment.setUserActiveWorkspace, {
      userId: coderUserId,
      coderWorkspaceId: workspaceMetadata.data.id!,
      assignmentId: args.assignmentId,
    });

    const coderOrigin = getCoderOrigin();

    const workspaceUrl = `${coderOrigin}/@${coderUserId}/${workspaceMetadata.data.name}.main/apps/code-server`;

    return { workspaceUrl, coderUserSessionKey: coderUserSessionKey.data.key! };
  },
});
