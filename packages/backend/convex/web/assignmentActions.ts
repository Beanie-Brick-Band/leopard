"use node";

import crypto from "node:crypto";

import { v } from "convex/values";
import { Sandbox } from "e2b";

import {
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
import { createClient } from "@package/coder-sdk/client";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { authComponent } from "../auth";
import { ensureUserActive, ensureWorkspaceRunning } from "../helpers/coder";
import { generateDownloadUrl } from "../helpers/minio";

const E2B_TEMPLATE = "leopard-workspace";
const CODE_SERVER_PORT = 13337;
const AUTH_PROXY_PORT = 13338;
const SANDBOX_TIMEOUT_MS = 10 * 60 * 1000;
const AUTH_TOKEN_TTL_SEC = 10 * 60;

function signAuthToken(secret: string, ttlSec: number): string {
  const payload = { exp: Math.floor(Date.now() / 1000) + ttlSec };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("hex");
  return `${payloadB64}.${sig}`;
}

export const launchE2BWorkspace = action({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }
    const userId = user._id.toString();

    const existing = await ctx.runQuery(
      internal.web.assignment.getUserActiveWorkspace,
      { userId },
    );
    if (existing?.e2bSandboxId) {
      try {
        await Sandbox.kill(existing.e2bSandboxId);
      } catch {
        // previous sandbox already gone
      }
    }

    const authSecret = crypto.randomBytes(32).toString("hex");
    const authToken = signAuthToken(authSecret, AUTH_TOKEN_TTL_SEC);

    const sandbox = await Sandbox.create(E2B_TEMPLATE, {
      timeoutMs: SANDBOX_TIMEOUT_MS,
      envs: {
        AUTH_PROXY_SECRET: authSecret,
      },
    });

    // Set hostname = sandboxId so the VS Code extension's os.hostname() lets
    // the backend resolve which workspace to attribute events to.
    await sandbox.commands.run(`sudo -n hostname ${sandbox.sandboxId}`);

    const starterCodeKey = await ctx.runQuery(
      internal.web.assignment.internalGetAssignmentStarterCodeKey,
      { assignmentId: args.assignmentId },
    );
    if (starterCodeKey) {
      const downloadUrl = await generateDownloadUrl(starterCodeKey);
      await sandbox.commands.run(
        `curl -fsSL -o /tmp/starter.zip "${downloadUrl}" && unzip -o /tmp/starter.zip -d /home/user/workspace && rm /tmp/starter.zip`,
      );
    }

    const convexUrl =
      process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
    const settings = JSON.stringify(
      {
        "workbench.secondarySideBar.defaultVisibility": "hidden",
        "chat.disableAIFeatures": true,
        "leopard.convexUrl": convexUrl,
      },
      null,
      2,
    );
    await sandbox.commands.run(
      `mkdir -p /home/user/.local/share/code-server/User`,
    );
    await sandbox.files.write(
      "/home/user/.local/share/code-server/User/settings.json",
      settings,
    );

    // code-server binds to loopback; only the auth-proxy is reachable from E2B's public URL.
    await sandbox.commands.run(
      `nohup /opt/code-server/bin/code-server --auth none --bind-addr 127.0.0.1:${CODE_SERVER_PORT} --extensions-dir /opt/code-server-extensions /home/user/workspace > /tmp/code-server.log 2>&1 &`,
      { background: true },
    );

    await sandbox.commands.run(
      `cd /opt/auth-proxy && nohup node auth-proxy.mjs > /tmp/auth-proxy.log 2>&1 &`,
      { background: true },
    );

    // Poll code-server /healthz over loopback so we don't hand back a URL that 502s
    for (let i = 0; i < 30; i++) {
      const probe = await sandbox.commands.run(
        `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${CODE_SERVER_PORT}/healthz || true`,
      );
      if (probe.stdout.trim() === "200") break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    await ctx.runMutation(internal.web.assignment.setUserActiveE2BWorkspace, {
      userId,
      e2bSandboxId: sandbox.sandboxId,
      assignmentId: args.assignmentId,
      expiresAt: Date.now() + SANDBOX_TIMEOUT_MS,
    });

    const host = sandbox.getHost(AUTH_PROXY_PORT);
    const workspaceUrl = `https://${host}/?token=${encodeURIComponent(authToken)}&folder=/home/user/workspace`;

    return { workspaceUrl };
  },
});

export const launchWorkspace = action({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const coderClient = createClient({
      baseUrl: process.env.CODER_API_URL!,
      auth: process.env.CODER_API_KEY!,
    });

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
    await ensureUserActive({ client: coderClient, userId: coderUserId });

    // Determine workspace mode (ephemeral vs persistent)
    const workspaceMode: string = await ctx.runQuery(
      internal.web.settings.internalGetWorkspaceMode,
      {},
    );
    const templateName =
      workspaceMode === "ephemeral" ? "kubernetes-ephermal" : "kubernetes";

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
            (t) => t.name === templateName,
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

    await ensureWorkspaceRunning({
      client: coderClient,
      userId: coderUserId,
      workspaceName: args.assignmentId.toString(),
      workspaceId: workspaceMetadata.data.id!,
      currentStatus: workspaceMetadata.data.latest_build?.status,
    });

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

    await ctx.runMutation(internal.web.assignment.setUserActiveWorkspace, {
      userId: coderUserId,
      coderWorkspaceId: workspaceMetadata.data.id!,
      assignmentId: args.assignmentId,
    });

    const coderOrigin = new URL(process.env.CODER_API_URL!).origin;

    const workspaceUrl = `${coderOrigin}/@${coderUserId}/${workspaceMetadata.data.name}.main/apps/code-server`;

    return { workspaceUrl, coderUserSessionKey: coderUserSessionKey.data.key! };
  },
});
