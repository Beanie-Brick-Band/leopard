import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../../convex/_generated/api";
import * as apiModule from "../../convex/_generated/api";
import { MutationCtx } from "../../convex/_generated/server";
import schema from "../../convex/schema";
import { seedUserRole } from "../helpers/seed";

const authMocks = vi.hoisted(() => ({
  getAnyUserById: vi.fn(),
  safeGetAuthUser: vi.fn(),
}));
vi.mock("../../convex/auth", () => ({
  authComponent: {
    getAnyUserById: authMocks.getAnyUserById,
    safeGetAuthUser: authMocks.safeGetAuthUser,
  },
}));

const getAnyUserById = authMocks.getAnyUserById;
const safeGetAuthUser = authMocks.safeGetAuthUser;

function makeTestClient() {
  const modules: Record<string, () => Promise<unknown>> = {
    "convex/_generated/api.ts": () => Promise.resolve(apiModule),
    "convex/web/user.ts": () => import("../../convex/web/user"),
  };

  return convexTest(schema, modules);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("web/user", () => {
  describe("getCurrentUserRole", () => {
    it("defaults to student when the authenticated user has no saved role", async () => {
      const t = makeTestClient();
      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "student@example.com",
      });

      await expect(t.query(api.web.user.getCurrentUserRole, {})).resolves.toBe(
        "student",
      );
    });
  });

  describe("searchUsers", () => {
    it("denies non-admins", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "teacher@example.com",
      });

      await expect(
        t.query(api.web.user.searchUsers, { searchTerm: "teach" }),
      ).rejects.toThrow("Only admins can access this endpoint");
    });

    it("returns enriched matches for admins", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "admin_1", "admin");
      await seedUserRole(t, "teacher_1", "teacher");
      await seedUserRole(t, "student_1", "student");

      safeGetAuthUser.mockResolvedValue({
        _id: "admin_1",
        email: "admin@example.com",
      });
      getAnyUserById.mockImplementation(async (_ctx, id: string) => {
        if (id === "admin_1") {
          return {
            email: "admin@example.com",
            name: "Admin Example",
          };
        }

        if (id === "teacher_1") {
          return {
            displayUsername: "teach_handle",
            email: "teacher@example.com",
            name: "Teacher Example",
            username: "teacher-user",
          };
        }

        if (id === "student_1") {
          return {
            email: "student@example.com",
            name: "Student Example",
          };
        }

        return null;
      });

      const results = await t.query(api.web.user.searchUsers, {
        searchTerm: "teach",
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        displayName: "Teacher Example",
        email: "teacher@example.com",
        role: "teacher",
        userId: "teacher_1",
      });
    });
  });

  describe("updateUserRole", () => {
    it("updates an existing user role", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "admin_1", "admin");
      await seedUserRole(t, "student_1", "student");

      safeGetAuthUser.mockResolvedValue({
        _id: "admin_1",
        email: "admin@example.com",
      });
      getAnyUserById.mockResolvedValue({
        email: "student@example.com",
        name: "Student Example",
      });

      await t.mutation(api.web.user.updateUserRole, {
        role: "teacher",
        userId: "student_1",
      });

      const updatedUser = await t.run(async (ctx: MutationCtx) => {
        return ctx.db
          .query("users")
          .withIndex("uid", (q) => q.eq("uid", "student_1"))
          .first();
      });

      expect(updatedUser?.role).toBe("teacher");
    });

    it("prevents admins from removing their own admin access", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "admin_1", "admin");

      safeGetAuthUser.mockResolvedValue({
        _id: "admin_1",
        email: "admin@example.com",
      });

      await expect(
        t.mutation(api.web.user.updateUserRole, {
          role: "teacher",
          userId: "admin_1",
        }),
      ).rejects.toThrow("Admins cannot remove their own admin access");
    });
  });
});
