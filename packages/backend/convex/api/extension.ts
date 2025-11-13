import {mutation, query} from "../_generated/server"
import { v } from "convex/values";
import { Doc } from "../_generated/dataModel";
import { WithoutSystemFields } from "convex/server";

export const addBatchedChangesMutation = mutation({
  args: {
    changes: v.array(v.object({
        changeDetails: v.object({}),
        eventType: v.string(),
        timestamp: v.number(),
        workspaceId: v.id("workspaces"),
        metadata: v.object({})
    }))
  },
  handler: async (ctx, args) => {
    const insertedIds = [];

    for (const change of args.changes) {
        const newEvent : WithoutSystemFields<Doc<"events">> = {
            changeDetails: change.changeDetails,
            eventType: change.eventType,
            timestamp: change.timestamp,
            workspaceId: change.workspaceId,
            metadata: change.metadata
        }
        const eventId = await ctx.db.insert("events", newEvent)
        insertedIds.push(eventId)
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

