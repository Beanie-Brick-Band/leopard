import { v } from "convex/values";

import { query } from "../_generated/server";
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
