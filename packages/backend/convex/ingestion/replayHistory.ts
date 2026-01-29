import {v} from "convex/values";
import { query } from "../_generated/server";

export const replayHistoryQuery = query({
    args: {
        workspaceId: v.id("workspaces"),    
    },
    handler: async (ctx, args) => {
        const events = await ctx.db.query("events")
            .withIndex("workspaceId_timestamp", (q) => q.eq("workspaceId", args.workspaceId))
            .collect();
        return events;
    },
});

