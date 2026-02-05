import { getManyVia } from "convex-helpers/server/relationships";
import { v } from "convex/values";

import { MutationCtx, mutation, QueryCtx, query } from "../_generated/server";
import { authComponent } from "../auth";
import { getUserRole } from "../helpers/roles";

type DatabaseCtx = QueryCtx | MutationCtx;

const requireStudentRole = async (ctx: DatabaseCtx, userId: string) => {
  const role = await getUserRole(ctx, userId);
  if (role !== "student") {
    throw new Error("Only students can access classroom enrollment endpoints");
  }
};

export const getEnrolled = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return [];
    }

    await requireStudentRole(ctx, user._id);

    // lookup classrooms via classroomStudentsRelations
    const classrooms = await getManyVia(
      ctx.db,
      "classroomStudentsRelations",
      "classroomId",
      "studentId_classroomId",
      user._id,
      "studentId",
    );

    return classrooms;
  },
});

export const getAvailableToEnroll = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return [];
    }

    await requireStudentRole(ctx, user._id);

    // Get all classrooms
    const allClassrooms = await ctx.db.query("classrooms").collect();

    // Get enrolled classrooms via relations
    const classrooms = await getManyVia(
      ctx.db,
      "classroomStudentsRelations",
      "classroomId",
      "studentId_classroomId",
      user._id,
      "studentId",
    );

    const enrolledClassroomIds = classrooms
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .map((c) => c._id);

    // Filter out enrolled classrooms
    const availableClassrooms = allClassrooms.filter(
      (classroom) => !enrolledClassroomIds.includes(classroom._id),
    );

    return availableClassrooms;
  },
});

export const enroll = mutation({
  args: {
    classroomId: v.id("classrooms"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated");
    }

    await requireStudentRole(ctx, user._id);

    // Check if already enrolled
    const existingRelation = await ctx.db
      .query("classroomStudentsRelations")
      .withIndex("studentId_classroomId", (q) =>
        q.eq("studentId", user._id).eq("classroomId", args.classroomId),
      )
      .first();

    if (existingRelation) {
      throw new Error("Already enrolled in this classroom");
    }

    // Create enrollment relation
    await ctx.db.insert("classroomStudentsRelations", {
      classroomId: args.classroomId,
      studentId: user._id,
    });
  },
});
