import { v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { authComponent } from "../auth";

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return null;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return profile;
  },
});

export const createProfile = mutation({
  args: {
    role: v.union(v.literal("student"), v.literal("teacher")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existingProfile) {
      throw new Error("Profile already exists");
    }

    // Create profile
    const profileId = await ctx.db.insert("userProfiles", {
      userId: user._id,
      role: args.role,
      createdAt: Date.now(),
    });

    return profileId;
  },
});

export const updateRole = mutation({
  args: {
    role: v.union(v.literal("student"), v.literal("teacher")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      role: args.role,
    });
  },
});

// Internal mutations for admin/development use
// Use these from Convex dashboard to set user roles
// IMPORTANT: betterAuthUserId should be a STRING from the betterAuth/user table _id field
// Example: "kz1234567890abcdefghijk" (NOT a Convex Id type)
export const setUserRole = internalMutation({
  args: {
    betterAuthUserId: v.string(), // Copy the _id from betterAuth/user table (it's a string)
    role: v.union(v.literal("student"), v.literal("teacher")),
  },
  handler: async (ctx, args) => {
    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.betterAuthUserId))
      .first();

    if (existingProfile) {
      // Update existing profile
      await ctx.db.patch(existingProfile._id, {
        role: args.role,
      });
      console.log(
        `Updated user ${args.betterAuthUserId} to role: ${args.role}`,
      );
      return existingProfile._id;
    } else {
      // Create new profile
      const profileId = await ctx.db.insert("userProfiles", {
        userId: args.betterAuthUserId,
        role: args.role,
        createdAt: Date.now(),
      });
      console.log(
        `Created profile for user ${args.betterAuthUserId} with role: ${args.role}`,
      );
      return profileId;
    }
  },
});

// Internal query to list all users with their profiles (for debugging/admin)
export const listAllUsersWithProfiles = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get all profiles
    const profiles = await ctx.db.query("userProfiles").collect();

    // For each profile, get user info from Better Auth
    const usersWithProfiles = await Promise.all(
      profiles.map(async (profile) => {
        const user = await authComponent.getAnyUserById(ctx, profile.userId);
        return {
          userId: profile.userId,
          email: user?.email ?? "unknown",
          name: user?.name ?? "unknown",
          role: profile.role,
          createdAt: profile.createdAt,
        };
      }),
    );

    return usersWithProfiles;
  },
});
