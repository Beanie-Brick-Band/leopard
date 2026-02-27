import { v } from "convex/values";
import z from "zod";

import * as WorkspaceEvents from "@package/validators/workspaceEvents";

import { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";

export const getReplays = query({
  args: {},
  handler: async (ctx, args) => {
    // const auth = authComponent.getAuthUser(ctx);
    // if (!auth) {
    //   throw new Error("Unauthorized");
    // }

    const allEvents = await ctx.db.query("events").collect();

    // bucket events by workspaceId
    const eventsByWorkspaceId = allEvents.reduce(
      (acc, event) => {
        acc[event.workspaceId] = [
          ...(acc[event.workspaceId] || []),
          event.metadata,
        ];
        return acc;
      },
      {} as Record<Id<"workspaces">, Record<string, any>[]>,
    );

    for (const workspaceId in eventsByWorkspaceId) {
      const l = eventsByWorkspaceId[workspaceId as Id<"workspaces">];
      if (!l) continue;

      l.sort((a, b) => a.timestamp - b.timestamp);
    }

    return eventsByWorkspaceId;
  },
});

export const getReplay = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    // TODO get auth to work
    // const auth = authComponent.getAuthUser(ctx);
    // if (!auth) {
    //   throw new Error("Unauthorized");
    // }

    const events = await ctx.db
      .query("events")
      .withIndex("workspaceId_timestamp", (q) =>
        q.eq("workspaceId", args.workspaceId),
      )
      .order("asc")
      .collect();

    return z.array(WorkspaceEvents.WorkspaceEvent).parse(events);
  },
});
