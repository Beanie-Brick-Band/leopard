import { WithoutSystemFields } from "convex/server";
import { v } from "convex/values";

import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { authComponent } from "../auth";

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
    const insertedIds = [];

    // const user = await authComponent.safeGetAuthUser(ctx);
    // if (!user) {
    //   console.log(args.changes);
    //   return;
    // }

    // // get active workspace for user
    // // fetch the worksace somehwere
    // const workspace = await ctx.runQuery(
    //   internal.web.assignment.getUserActiveWorkspace,
    //   {
    //     userId: user._id.toString(),
    //   },
    // );

    // if (!workspace) {
    //   console.log("No active workspace found for user", user._id.toString());
    //   return;
    // }

    // TODO: implement workspace session retrieval flow
    for (const change of args.changes) {
      const newEvent: WithoutSystemFields<Doc<"events">> = {
        workspaceId: "jx75g1jdes38h6v3bq54w7z2zn7z51kf" as Id<"workspaces">, //workspace._id,
        ...change,
      };
      const eventId = await ctx.db.insert("events", newEvent);
      insertedIds.push(eventId);
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
