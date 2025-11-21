import { WithoutSystemFields } from "convex/server";
import { v } from "convex/values";

import { Doc, Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

export const addBatchedChangesMutation = mutation({
  args: {
    changes: v.array(
      v.object({
        eventType: v.string(),
        timestamp: v.number(),
        metadata: v.record(v.string(), v.any()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const insertedIds = [];

    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      console.log(args.changes);
      return;
    }

    // get active workspace for user
    // fetch the worksace somehwere

    for (const change of args.changes) {
      const newEvent: WithoutSystemFields<Doc<"events">> = {
        eventType: change.eventType,
        timestamp: change.timestamp,
        workspaceId: "" as Id<"workspaces">,
        metadata: change.metadata,
      };
      const eventId = await ctx.db.insert("events", newEvent);
      insertedIds.push(eventId);
    }
  },
});

export const getWatchedFlagQuery = query({
  args: {
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");
    return workspace.watchedFlag;
  },
});
