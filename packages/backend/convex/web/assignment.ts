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
import { createClient } from "@package/coder-sdk/client";

import { internal } from "../_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { authComponent } from "../auth";

export const getById = query({
  args: { id: v.id("assignments") },
  handler: async (ctx, args) => {
    const auth = authComponent.getAuthUser(ctx);
    if (!auth) {
      throw new Error("Unauthorized");
    }
    const assignment = await ctx.db.get(args.id);
    return assignment;
  },
});

export const getByIds = query({
  args: { ids: v.array(v.id("assignments")) },
  handler: async (ctx, args) => {
    const auth = authComponent.getAuthUser(ctx);
    if (!auth) {
      throw new Error("Unauthorized");
    }
    const assignments = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return assignments.filter(Boolean);
  },
});

export const setUserActiveWorkspace = internalMutation({
  args: {
    userId: v.string(),
    coderWorkspaceId: v.string(),
  },
  handler: async (ctx, args) => {
    const workspaces = await ctx.db.query("workspaces").collect();

    for (const ws of workspaces) {
      // delete any existing active workspaces for this user
      if (
        ws.userId === args.userId &&
        ws.coderWorkspaceId !== args.coderWorkspaceId
      ) {
        await ctx.db.delete(ws._id);
      }
    }

    await ctx.db.insert("workspaces", {
      userId: args.userId,
      coderWorkspaceId: args.coderWorkspaceId,
    });

    return;
  },
});

export const getUserActiveWorkspace = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const workspace = await ctx.db
      .query("workspaces")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    return workspace;
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
      // create workspace
      await createUserWorkspace({
        client: coderClient,
        body: {
          name: `${args.assignmentId.toString()}`,
          template_id: templatesResp.data?.at(0)?.id,
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
    });

    const coderApiUrl = new URL(process.env.CODER_API_URL!);
    const coderHost = coderApiUrl.host;

    const workspaceUrl = `https://${coderHost}/@${coderUserId}/${workspaceMetadata.data.name}.main/apps/code-server`;

    return { workspaceUrl, coderUserSessionKey: coderUserSessionKey.data.key! };
  },
});
