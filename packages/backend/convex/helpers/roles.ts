import { MutationCtx, QueryCtx } from "../_generated/server";

export type UserRole = "admin" | "student" | "teacher";

type RoleLookupCtx = QueryCtx | MutationCtx;

export const getUserRole = async (
  ctx: RoleLookupCtx,
  userId: string,
): Promise<UserRole> => {
  const user = await ctx.db
    .query("users")
    .withIndex("uid", (q) => q.eq("uid", userId))
    .first();

  if (!user) {
    throw new Error("User role not found");
  }

  return user.role;
};
