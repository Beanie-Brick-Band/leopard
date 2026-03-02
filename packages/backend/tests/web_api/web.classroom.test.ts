import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../../convex/_generated/api";
import * as apiModule from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { seedClassroom, seedEnrollment, seedUserRole } from "../helpers/seed";

const authMocks = vi.hoisted(() => ({
  safeGetAuthUser: vi.fn(),
}));
vi.mock("../../convex/auth", () => ({
  authComponent: {
    safeGetAuthUser: authMocks.safeGetAuthUser,
  },
}));

const safeGetAuthUser = authMocks.safeGetAuthUser;

function makeTestClient() {
  const modules: Record<string, () => Promise<unknown>> = {
    "convex/_generated/api.ts": () => Promise.resolve(apiModule),
    "convex/web/classroom.ts": () => import("../../convex/web/classroom"),
  };
  return convexTest(schema, modules);
}

async function seedTestClassroom(
  t: ReturnType<typeof makeTestClient>,
  classroom: {
    className: string;
    ownerId?: string;
    assistantIds?: string[];
  },
) {
  return seedClassroom(t, {
    className: classroom.className,
    ownerId: classroom.ownerId ?? "owner_1",
    assistantIds: classroom.assistantIds,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("web/classroom", () => {
  describe("getEnrolled", () => {
    it("returns [] when not logged in", async () => {
      const t = makeTestClient();
      safeGetAuthUser.mockResolvedValue(null);

      const res = await t.query(api.web.classroom.getEnrolled, {});
      expect(res).toEqual([]);
    });

    it("denies teacher", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      await expect(t.query(api.web.classroom.getEnrolled, {})).rejects.toThrow(
        "Only students can access classroom enrollment endpoints",
      );
    });

    it("allows admin", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "admin_1", "admin");
      safeGetAuthUser.mockResolvedValue({
        _id: "admin_1",
        email: "a@example.com",
      });

      const res = await t.query(api.web.classroom.getEnrolled, {});
      expect(Array.isArray(res)).toBe(true);
    });

    it("returns enrolled classrooms", async () => {
      const t = makeTestClient();
      const c1 = await seedTestClassroom(t, { className: "C1" });
      const c2 = await seedTestClassroom(t, { className: "C2" });
      await seedEnrollment(t, c2, "student_1");

      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "s@example.com",
      });

      const res = await t.query(api.web.classroom.getEnrolled, {});
      const ids = res
        .filter((c): c is Doc<"classrooms"> => !!c)
        .map((c) => c._id);
      expect(ids).toEqual([c2]);
      expect(ids).not.toContain(c1);
    });
  });

  describe("getAvailableToEnroll", () => {
    it("returns [] when not logged in", async () => {
      const t = makeTestClient();
      safeGetAuthUser.mockResolvedValue(null);

      const res = await t.query(api.web.classroom.getAvailableToEnroll, {});
      expect(res).toEqual([]);
    });

    it("denies teacher", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      await expect(
        t.query(api.web.classroom.getAvailableToEnroll, {}),
      ).rejects.toThrow(
        "Only students can access classroom enrollment endpoints",
      );
    });

    it("allows admin", async () => {
      const t = makeTestClient();
      const c1 = await seedTestClassroom(t, { className: "C1" });
      await seedUserRole(t, "admin_1", "admin");
      safeGetAuthUser.mockResolvedValue({
        _id: "admin_1",
        email: "a@example.com",
      });

      const res = await t.query(api.web.classroom.getAvailableToEnroll, {});
      expect(res.map((c: Doc<"classrooms">) => c._id)).toContain(c1);
    });

    it("returns classrooms the student is not enrolled in", async () => {
      const t = makeTestClient();
      const c1 = await seedTestClassroom(t, { className: "C1" });
      const c2 = await seedTestClassroom(t, { className: "C2" });
      const c3 = await seedTestClassroom(t, { className: "C3" });
      await seedEnrollment(t, c2, "student_1");

      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "s@example.com",
      });

      const res = await t.query(api.web.classroom.getAvailableToEnroll, {});
      const ids = res.map((c: Doc<"classrooms">) => c._id).sort();
      expect(ids).toEqual([c1, c3].sort());
      expect(ids).not.toContain(c2);
    });
  });

  describe("enroll", () => {
    it("throws User not authenticated when not logged in", async () => {
      const t = makeTestClient();
      const classroomId = await seedTestClassroom(t, { className: "C1" });
      safeGetAuthUser.mockResolvedValue(null);

      await expect(
        t.mutation(api.web.classroom.enroll, { classroomId }),
      ).rejects.toThrow("User not authenticated");
    });

    it("denies teacher", async () => {
      const t = makeTestClient();
      const classroomId = await seedTestClassroom(t, { className: "C1" });
      await seedUserRole(t, "teacher_1", "teacher");
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      await expect(
        t.mutation(api.web.classroom.enroll, { classroomId }),
      ).rejects.toThrow(
        "Only students can access classroom enrollment endpoints",
      );
    });

    it("allows admin", async () => {
      const t = makeTestClient();
      const classroomId = await seedTestClassroom(t, { className: "C1" });
      await seedUserRole(t, "admin_1", "admin");
      safeGetAuthUser.mockResolvedValue({
        _id: "admin_1",
        email: "a@example.com",
      });

      await t.mutation(api.web.classroom.enroll, { classroomId });

      const res = await t.query(api.web.classroom.getEnrolled, {});

      const ids = res
        .filter((c): c is Doc<"classrooms"> => !!c)
        .map((c) => c._id);
      expect(ids).toContain(classroomId);
    });

    it("creates an enrollment relation", async () => {
      const t = makeTestClient();
      const classroomId = await seedTestClassroom(t, { className: "C1" });
      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "s@example.com",
      });

      await t.mutation(api.web.classroom.enroll, { classroomId });

      const res = await t.query(api.web.classroom.getEnrolled, {});
      const ids = res
        .filter((c): c is Doc<"classrooms"> => !!c)
        .map((c) => c._id);
      expect(ids).toContain(classroomId);
    });

    it("throws Already enrolled in this classroom", async () => {
      const t = makeTestClient();
      const classroomId = await seedTestClassroom(t, { className: "C1" });
      await seedEnrollment(t, classroomId, "student_1");

      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "s@example.com",
      });

      await expect(
        t.mutation(api.web.classroom.enroll, { classroomId }),
      ).rejects.toThrow("Already enrolled in this classroom");
    });
  });
});
