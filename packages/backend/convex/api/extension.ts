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
    // Extract workspace ID from hostname format: coder-<workspaceId>-<pod-id>
    // Example: coder-273044a0-03a7-49ef-b1a4-e1bbc3c49d9b-7b78cdf4d9-mx66l
    // UUID format has 5 parts separated by hyphens, so workspace ID is parts 1-5
    const hostnameParts = args.hostname.split("-");
    if (hostnameParts.length < 6) {
      console.log("Invalid hostname format:", args.hostname);
      return;
    }

    // The workspace ID is parts 1-5 (indices 1-5, excluding index 6+)
    const coderWorkspaceId = hostnameParts.slice(1, 6).join("-");
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(coderWorkspaceId)) {
      console.log("Invalid workspace ID format:", coderWorkspaceId);
      return;
    }

    // Lookup workspace by coderWorkspaceId
    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("coderWorkspaceId", (q) =>
        q.eq("coderWorkspaceId", coderWorkspaceId),
      )
      .first();

    if (!workspace) {
      console.log("No workspace found for coderWorkspaceId:", coderWorkspaceId);
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
