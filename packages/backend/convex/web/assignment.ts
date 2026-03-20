import { v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  query,
  QueryCtx,
} from "../_generated/server";
import { authComponent } from "../auth";
import { getUserRole } from "../helpers/roles";

const ensureCanAccessAssignment = async (
  ctx: QueryCtx,
  userId: string,
  assignmentId: Id<"assignments">,
) => {
  const assignment = await ctx.db.get(assignmentId);

  if (!assignment) {
    throw new Error("Assignment not found");
  }

  const classroom = await ctx.db.get(assignment.classroomId);

  if (!classroom) {
    throw new Error("Classroom not found");
  }

  if (classroom.ownerId === userId || classroom.assistantIds.includes(userId)) {
    return assignment;
  }

  const role = await getUserRole(ctx, userId);

  if (role === "admin") {
    return assignment;
  }

  if (role === "student") {
    const relation = await ctx.db
      .query("classroomStudentsRelations")
      .withIndex("studentId_classroomId", (q) =>
        q.eq("studentId", userId).eq("classroomId", classroom._id),
      )
      .first();

    if (!relation) {
      throw new Error("Not authorized to view this assignment");
    }

    return assignment;
  }

  throw new Error("Not authorized to view this assignment");
};

export const getById = query({
  args: { id: v.id("assignments") },
  handler: async (ctx, args) => {
    const auth = await authComponent.safeGetAuthUser(ctx);
    if (!auth) {
      throw new Error("Unauthorized");
    }
    return ensureCanAccessAssignment(ctx, auth._id, args.id);
  },
});

export const getByIds = query({
  args: { ids: v.array(v.id("assignments")) },
  handler: async (ctx, args) => {
    const auth = await authComponent.safeGetAuthUser(ctx);
    if (!auth) {
      throw new Error("Unauthorized");
    }

    return Promise.all(
      args.ids.map((id) => ensureCanAccessAssignment(ctx, auth._id, id)),
    );
  },
});

export const getMyActiveWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    return ctx.db
      .query("workspaces")
      .withIndex("userId_isActive", (q) =>
        q.eq("userId", user._id).eq("isActive", true),
      )
      .first();
  },
});

export const getMyWorkspaceForAssignment = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    await ensureCanAccessAssignment(ctx, user._id, args.assignmentId);

    return ctx.db
      .query("workspaces")
      .withIndex("assignmentId_userId", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("userId", user._id),
      )
      .first();
  },
});

export const setUserActiveWorkspace = internalMutation({
  args: {
    userId: v.string(),
    coderWorkspaceId: v.string(),
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, args) => {
    const userWorkspaces = await ctx.db
      .query("workspaces")
      .withIndex("userId_isActive", (q) => q.eq("userId", args.userId))
      .collect();

    let targetWorkspace = null;

    for (const ws of userWorkspaces) {
      if (ws.coderWorkspaceId === args.coderWorkspaceId) {
        targetWorkspace = ws;
        const patch: {
          isActive?: boolean;
          assignmentId?: typeof args.assignmentId;
        } = {};
        if (!ws.isActive) patch.isActive = true;
        if (args.assignmentId) patch.assignmentId = args.assignmentId;
        if (Object.keys(patch).length > 0) {
          await ctx.db.patch(ws._id, patch);
        }
      } else if (ws.isActive) {
        await ctx.db.patch(ws._id, { isActive: false });
      }
    }

    if (!targetWorkspace) {
      await ctx.db.insert("workspaces", {
        userId: args.userId,
        coderWorkspaceId: args.coderWorkspaceId,
        isActive: true,
        assignmentId: args.assignmentId,
      });
    }

    return;
  },
});

export const deactivateWorkspace = internalMutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.workspaceId, { isActive: false });
  },
});

export const getUserActiveWorkspace = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("userId_isActive", (q) =>
        q.eq("userId", args.userId).eq("isActive", true),
      )
      .first();
    return workspace;
  },
});

export const internalGetAssignmentStarterCodeKey = internalQuery({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }
    return assignment.starterCodeStorageKey ?? null;
  },
});

export const getLastEditedTimestamp = query({
  args: { assignmentId: v.id("assignments") },
  handler: async (ctx, args) => {
    const auth = await authComponent.safeGetAuthUser(ctx);
    if (!auth) {
      throw new Error("Unauthorized");
    }

    await ensureCanAccessAssignment(ctx, auth._id, args.assignmentId);

    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("assignmentId_userId", (q) =>
        q.eq("assignmentId", args.assignmentId).eq("userId", auth._id),
      )
      .first();

    if (!workspace) {
      return null;
    }

    const lastEvent = await ctx.db
      .query("events")
      .withIndex("workspaceId_timestamp", (q) =>
        q.eq("workspaceId", workspace._id),
      )
      .order("desc")
      .first();

    return lastEvent?.timestamp ?? null;
  },
});
