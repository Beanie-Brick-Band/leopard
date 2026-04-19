import { WithoutSystemFields } from "convex/server";
import { v } from "convex/values";

import { Doc } from "../_generated/dataModel";
import { mutation } from "../_generated/server";

export const addBatchedChangesMutation = mutation({
  args: {
    hostname: v.string(),
    changes: v.array(
      v.object({
        eventType: v.string(),
        timestamp: v.number(),
        metadata: v.record(v.string(), v.any()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Try E2B first: hostname inside an E2B sandbox is the sandbox ID.
    let workspace = await ctx.db
      .query("workspaces")
      .withIndex("e2bSandboxId", (q) => q.eq("e2bSandboxId", args.hostname))
      .first();

    if (!workspace) {
      // Fall back to Coder hostname format: coder-<uuid>-<pod-suffix>
      const hostnameParts = args.hostname.split("-");
      if (hostnameParts.length >= 6) {
        const coderWorkspaceId = hostnameParts.slice(1, 6).join("-");
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(coderWorkspaceId)) {
          workspace = await ctx.db
            .query("workspaces")
            .withIndex("coderWorkspaceId", (q) =>
              q.eq("coderWorkspaceId", coderWorkspaceId),
            )
            .first();
        }
      }
    }

    if (!workspace) {
      console.log("No workspace found for hostname:", args.hostname);
      return;
    }

    for (const change of args.changes) {
      const newEvent: WithoutSystemFields<Doc<"events">> = {
        workspaceId: workspace._id,
        ...change,
      };
      const eventId = await ctx.db.insert("events", newEvent);
    }
  },
});

// TODO: Implement later
// export const getWatchedFlagQuery = query({
//   args: {
//     workspaceId: v.id("workspaces"),
//   },
//   handler: async (ctx, args) => {
//     const workspace = await ctx.db.get(args.workspaceId);
//     if (!workspace) throw new Error("Workspace not found");
//     return workspace.watchedFlag;
//   },
// });
