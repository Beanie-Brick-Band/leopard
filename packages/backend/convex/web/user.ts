import { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";

type UserRole = "admin" | "student" | "teacher";
type DbCtx = QueryCtx | MutationCtx;

export async function getUserRole(ctx: DbCtx, userId: string): Promise<UserRole> {
  const user = await ctx.db
    .query("users")
    .withIndex("uid", (q) => q.eq("uid", userId))
    .first();

  if (!user) {
    return "student";
  }

  return user.role;
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
