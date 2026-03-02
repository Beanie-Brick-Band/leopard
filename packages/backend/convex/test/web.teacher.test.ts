import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../_generated/api";
import * as apiModule from "../_generated/api";
import schema from "../schema";
import {
  seedAssignment,
  seedClassroom,
  seedEnrollment,
  seedFlag,
  seedSubmission,
  seedUserRole,
} from "./testHelpers";

const authMocks = vi.hoisted(() => ({
  safeGetAuthUser: vi.fn(),
  getAnyUserById: vi.fn(),
}));
vi.mock("../auth", () => ({
  authComponent: {
    safeGetAuthUser: authMocks.safeGetAuthUser,
    getAnyUserById: authMocks.getAnyUserById,
  },
}));

const safeGetAuthUser = authMocks.safeGetAuthUser;
const getAnyUserById = authMocks.getAnyUserById;

function makeTestClient() {
  const modules: Record<string, () => Promise<unknown>> = {
    "convex/_generated/api.ts": () => Promise.resolve(apiModule),
    "convex/web/teacher.ts": () => import("../web/teacher"),
  };
  return convexTest(schema, modules);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("web/teacher", () => {
  describe("createClassroom", () => {
    // Requires authentication before creating classrooms.
    it("throws Not authenticated when not logged in", async () => {
      const t = makeTestClient();
      safeGetAuthUser.mockResolvedValue(null);

      await expect(
        t.mutation(api.web.teacher.createClassroom, { className: "C1" }),
      ).rejects.toThrow("Not authenticated");
    });

    // Denies classroom creation for students.
    it("denies student", async () => {
      const t = makeTestClient();
      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "s@example.com",
      });

      await expect(
        t.mutation(api.web.teacher.createClassroom, { className: "C1" }),
      ).rejects.toThrow("Only teachers can access this endpoint");
    });

    // Creates the classroom and ensures assistantIds do not include the owner.
    it("creates classroom and filters assistantIds removing owner", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      const classroomId = await t.mutation(api.web.teacher.createClassroom, {
        className: "C1",
        assistantIds: ["teacher_1", "assistant_1"],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const classroom = await t.run(async (ctx: any) =>
        ctx.db.get(classroomId),
      );
      expect(classroom.ownerId).toBe("teacher_1");
      expect(classroom.assistantIds).toEqual(["assistant_1"]);
      expect(classroom.metadata).toBe("{}");
    });
  });

  describe("getMyClassrooms", () => {
    // Admin role should see every classroom.
    it("admin sees all classrooms", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "admin_1", "admin");
      await seedClassroom(t, { ownerId: "teacher_1", className: "C1" });
      await seedClassroom(t, { ownerId: "teacher_2", className: "C2" });
      safeGetAuthUser.mockResolvedValue({
        _id: "admin_1",
        email: "a@example.com",
      });

      const res = await t.query(api.web.teacher.getMyClassrooms, {});
      expect(res.length).toBe(2);
    });

    // Teacher role should see only classrooms they own or assist.
    it("teacher sees only owned/assisted classrooms", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      await seedClassroom(t, { ownerId: "teacher_1", className: "Owned" });
      await seedClassroom(t, {
        ownerId: "teacher_2",
        assistantIds: ["teacher_1"],
        className: "Assisted",
      });
      await seedClassroom(t, { ownerId: "teacher_2", className: "Other" });

      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });
      const res = await t.query(api.web.teacher.getMyClassrooms, {});
      expect(res.map((c) => c.className).sort()).toEqual(
        ["Owned", "Assisted"].sort(),
      );
    });
  });

  describe("updateClassroom", () => {
    // Students cannot update classroom metadata.
    it("denies student", async () => {
      const t = makeTestClient();
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "s@example.com",
      });

      await expect(
        t.mutation(api.web.teacher.updateClassroom, {
          classroomId,
          className: "X",
        }),
      ).rejects.toThrow("Only teachers can access this endpoint");
    });

    // Assistants can update classrooms, but their own id is filtered out of assistantIds.
    it("assistant can update and assistantIds filter out self", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "assistant_1", "teacher");
      const classroomId = await seedClassroom(t, {
        ownerId: "teacher_owner",
        assistantIds: ["assistant_1"],
      });
      safeGetAuthUser.mockResolvedValue({
        _id: "assistant_1",
        email: "a@example.com",
      });

      await t.mutation(api.web.teacher.updateClassroom, {
        classroomId,
        assistantIds: ["assistant_1", "assistant_2"],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const classroom = await t.run(async (ctx: any) =>
        ctx.db.get(classroomId),
      );
      expect(classroom.assistantIds).toEqual(["assistant_2"]);
    });
  });

  describe("enrollment mutations", () => {
    // updateEnrollmentStatus(approved) creates an enrollment relation when missing.
    it("updateEnrollmentStatus approved inserts relation when missing", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      await t.mutation(api.web.teacher.updateEnrollmentStatus, {
        classroomId,
        studentId: "student_1",
        status: "approved",
      });

      const enrolled = await t.query(api.web.teacher.getEnrolledStudents, {
        classroomId,
      });
      expect(enrolled.map((r) => r.studentId)).toEqual(["student_1"]);
    });

    // updateEnrollmentStatus(rejected) deletes an enrollment relation when present.
    it("updateEnrollmentStatus rejected deletes relation when present", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      await seedEnrollment(t, classroomId, "student_1");
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      await t.mutation(api.web.teacher.updateEnrollmentStatus, {
        classroomId,
        studentId: "student_1",
        status: "rejected",
      });

      const enrolled = await t.query(api.web.teacher.getEnrolledStudents, {
        classroomId,
      });
      expect(enrolled.length).toBe(0);
    });

    // removeStudent throws when the student isn't enrolled.
    it("removeStudent throws when not enrolled", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      await expect(
        t.mutation(api.web.teacher.removeStudent, {
          classroomId,
          studentId: "student_1",
        }),
      ).rejects.toThrow("Student is not enrolled in this classroom");
    });
  });

  describe("getClassroomDetails", () => {
    // Returns classroom details including assignments and enriched student roster.
    it("returns classroom, assignments, and enriched enrolled students", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      const assignmentId = await seedAssignment(t, classroomId);
      await seedEnrollment(t, classroomId, "student_1");
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      getAnyUserById.mockResolvedValue({
        name: " Student Name ",
        email: "s@example.com",
      });

      const res = await t.query(api.web.teacher.getClassroomDetails, {
        classroomId,
      });
      expect(res.classroom._id).toBe(classroomId);
      expect(res.assignments.map((a) => a._id)).toEqual([assignmentId]);
      expect(res.studentCount).toBe(1);
      expect(res.enrolledStudents[0]).toMatchObject({
        studentId: "student_1",
        studentName: "Student Name",
        studentEmail: "s@example.com",
      });
    });
  });

  describe("deleteClassroom", () => {
    // Assistants cannot delete classrooms (owner/admin only).
    it("assistant cannot delete classroom", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "assistant_1", "teacher");
      const classroomId = await seedClassroom(t, {
        ownerId: "teacher_owner",
        assistantIds: ["assistant_1"],
      });

      safeGetAuthUser.mockResolvedValue({
        _id: "assistant_1",
        email: "a@example.com",
      });
      await expect(
        t.mutation(api.web.teacher.deleteClassroom, { classroomId }),
      ).rejects.toThrow("Only classroom owners can perform this action");
    });

    // Deleting a classroom cascades deletions to assignments, submissions, flags, and enrollments.
    it("owner deletes classroom and cascades assignments/submissions/flags/relations", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_owner", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_owner" });
      const assignmentId = await seedAssignment(t, classroomId);
      await seedEnrollment(t, classroomId, "student_1");
      const flagId = await seedFlag(t);
      await seedSubmission(t, {
        assignmentId,
        studentId: "student_1",
        flags: [flagId],
      });

      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_owner",
        email: "o@example.com",
      });

      await t.mutation(api.web.teacher.deleteClassroom, { classroomId });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const counts = await t.run(async (ctx: any) => {
        const classrooms = await ctx.db.query("classrooms").collect();
        const assignments = await ctx.db.query("assignments").collect();
        const relations = await ctx.db
          .query("classroomStudentsRelations")
          .collect();
        const submissions = await ctx.db.query("submissions").collect();
        const flags = await ctx.db.query("flags").collect();
        return {
          classrooms: classrooms.length,
          assignments: assignments.length,
          relations: relations.length,
          submissions: submissions.length,
          flags: flags.length,
        };
      });

      expect(counts).toEqual({
        classrooms: 0,
        assignments: 0,
        relations: 0,
        submissions: 0,
        flags: 0,
      });
    });
  });
});
