import { v } from "convex/values";

import type { UserRole } from "../helpers/roles";
import { mutation, MutationCtx, query, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";
import { getUserRole as getStoredUserRole } from "../helpers/roles";

type DbCtx = QueryCtx | MutationCtx;
const DEFAULT_ROLE: UserRole = "student";
const userRoleValidator = v.union(
  v.literal("admin"),
  v.literal("student"),
  v.literal("teacher"),
);

export async function getUserRole(
  ctx: DbCtx,
  userId: string,
): Promise<UserRole> {
  return getStoredUserRole(ctx, userId);
}

export async function requireAuth(ctx: DbCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}

export async function requireTeacherOrAdmin(ctx: DbCtx, userId: string) {
  const role = await getUserRole(ctx, userId);
  if (role !== "teacher" && role !== "admin") {
    throw new Error("Only teachers can access this endpoint");
  }
}

export async function requireAdmin(ctx: DbCtx, userId: string) {
  const role = await getUserRole(ctx, userId);
  if (role !== "admin") {
    throw new Error("Only admins can access this endpoint");
  }
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || null;
}

function matchesSearch(
  searchTerm: string,
  values: Array<string | null | undefined>,
) {
  if (!searchTerm) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(searchTerm));
}

function getDisplayName(user: {
  name: string | null;
  displayUsername: string | null;
  username: string | null;
  email: string | null;
  userId: string;
}) {
  return (
    user.name ??
    user.displayUsername ??
    user.username ??
    user.email ??
    user.userId
  );
}

export const ensureCurrentUserRole = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await requireAuth(ctx);

    const existingUser = await ctx.db
      .query("users")
      .withIndex("uid", (q) => q.eq("uid", authUser._id))
      .first();

    if (existingUser) {
      return existingUser.role;
    }

    await ctx.db.insert("users", {
      uid: authUser._id,
      role: DEFAULT_ROLE,
    });

    return DEFAULT_ROLE;
  },
});

export const getCurrentUserRole = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    return getUserRole(ctx, authUser._id);
  },
});

export const searchUsers = query({
  args: {
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx);
    await requireAdmin(ctx, authUser._id);

    const normalizedSearch = args.searchTerm?.trim().toLowerCase() ?? "";
    const users = await ctx.db.query("users").collect();

    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const authProfile = await authComponent.getAnyUserById(ctx, user.uid);
        const name = normalizeText(authProfile?.name);
        const email = normalizeText(authProfile?.email);
        const username = normalizeText(authProfile?.username);
        const displayUsername = normalizeText(authProfile?.displayUsername);

        return {
          displayName: getDisplayName({
            name,
            displayUsername,
            username,
            email,
            userId: user.uid,
          }),
          displayUsername,
          email,
          isCurrentUser: user.uid === authUser._id,
          name,
          role: user.role,
          userId: user.uid,
          username,
        };
      }),
    );

    return enrichedUsers
      .filter((user) =>
        matchesSearch(normalizedSearch, [
          user.displayName,
          user.displayUsername,
          user.email,
          user.name,
          user.role,
          user.userId,
          user.username,
        ]),
      )
      .sort((left, right) => {
        return (
          left.displayName.localeCompare(right.displayName) ||
          left.userId.localeCompare(right.userId)
        );
      })
      .slice(0, 50);
  },
});

export const updateUserRole = mutation({
  args: {
    role: userRoleValidator,
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx);
    await requireAdmin(ctx, authUser._id);

    if (args.userId === authUser._id && args.role !== "admin") {
      throw new Error("Admins cannot remove their own admin access");
    }

    const targetUser = await authComponent.getAnyUserById(ctx, args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("uid", (q) => q.eq("uid", args.userId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        role: args.role,
      });
      return args.role;
    }

    await ctx.db.insert("users", {
      uid: args.userId,
      role: args.role,
    });

    return args.role;
  },
});
