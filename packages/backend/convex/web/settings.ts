import { v } from "convex/values";

import { internalQuery, mutation, query } from "../_generated/server";
import { getUserRole, requireAuth } from "./user";

async function requireAdmin(ctx: Parameters<typeof requireAuth>[0]) {
  const user = await requireAuth(ctx);
  const role = await getUserRole(ctx, user._id);
  if (role !== "admin") {
    throw new Error("Only admins can access settings");
  }
  return user;
}

async function getSetting(
  ctx: Parameters<typeof requireAuth>[0],
  key: string,
) {
  return ctx.db
    .query("settings")
    .withIndex("key", (q) => q.eq("key", key))
    .first();
}

export const internalGetWorkspaceMode = internalQuery({
  args: {},
  handler: async (ctx) => {
    const setting = await getSetting(ctx, "workspaceMode");
    return (setting?.value as string) ?? "persistent";
  },
});

export const getWorkspaceMode = query({
  args: {},
  handler: async (ctx) => {
    const setting = await getSetting(ctx, "workspaceMode");
    // Default to "persistent" if not set
    return (setting?.value as string) ?? "persistent";
  },
});

export const setWorkspaceMode = mutation({
  args: {
    mode: v.union(v.literal("ephemeral"), v.literal("persistent")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const existing = await getSetting(ctx, "workspaceMode");
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.mode });
    } else {
      await ctx.db.insert("settings", {
        key: "workspaceMode",
        value: args.mode,
      });
    }

    return args.mode;
  },
});
