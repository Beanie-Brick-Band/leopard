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
}));
vi.mock("../auth", () => ({
  authComponent: {
    safeGetAuthUser: authMocks.safeGetAuthUser,
  },
}));

const safeGetAuthUser = authMocks.safeGetAuthUser;

function makeTestClient() {
  const modules: Record<string, () => Promise<unknown>> = {
    "convex/_generated/api.ts": () => Promise.resolve(apiModule),
    "convex/web/teacherAssignments.ts": () =>
      import("../web/teacherAssignments"),
  };
  return convexTest(schema, modules);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("web/teacherAssignments", () => {
  describe("getAssignmentsByClassroom", () => {
    // Denies students who are not enrolled from listing classroom assignments.
    it("denies student not enrolled", async () => {
      const t = makeTestClient();
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      const assignmentId = await seedAssignment(t, classroomId);

      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "s@example.com",
      });

      await expect(
        t.query(api.web.teacherAssignments.getAssignmentsByClassroom, {
          classroomId,
        }),
      ).rejects.toThrow("Not authorized to view classroom assignments");
    });

    // Allows an enrolled student to list the classroom's assignments.
    it("allows enrolled student", async () => {
      const t = makeTestClient();
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      const assignmentId = await seedAssignment(t, classroomId, { name: "A1" });
      await seedEnrollment(t, classroomId, "student_1");

      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "s@example.com",
      });
      const res = await t.query(
        api.web.teacherAssignments.getAssignmentsByClassroom,
        {
          classroomId,
        },
      );
      expect(res.map((a) => a._id)).toEqual([assignmentId]);
    });

    // Denies teachers who are not the classroom owner/assistant.
    it("denies teacher who is not owner/assistant", async () => {
      const t = makeTestClient();
      const classroomId = await seedClassroom(t, { ownerId: "teacher_owner" });
      await seedAssignment(t, classroomId);
      await seedUserRole(t, "teacher_other", "teacher");

      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_other",
        email: "t@example.com",
      });

      await expect(
        t.query(api.web.teacherAssignments.getAssignmentsByClassroom, {
          classroomId,
        }),
      ).rejects.toThrow("Not authorized to view classroom assignments");
    });
  });

  describe("createAssignment / updateAssignment", () => {
    // Creates an assignment and ensures it is appended to the classroom.
    it("teacher owner can create assignment and it is added to classroom", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      const assignmentId = await t.mutation(
        api.web.teacherAssignments.createAssignment,
        {
          classroomId,
          name: "New",
          dueDate: 10,
          releaseDate: 1,
        },
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const classroom = await t.run(async (ctx: any) =>
        ctx.db.get(classroomId),
      );
      expect(classroom.assignments).toContain(assignmentId);
    });

    // Rejects updates where dueDate is not after releaseDate.
    it("updateAssignment enforces dueDate > releaseDate", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      const assignmentId = await seedAssignment(t, classroomId, {
        releaseDate: 10,
        dueDate: 20,
      });
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      await expect(
        t.mutation(api.web.teacherAssignments.updateAssignment, {
          assignmentId,
          dueDate: 5,
        }),
      ).rejects.toThrow("Due date must be after release date");
    });

    // Returns the assignment id when no fields are provided (no-op update).
    it("updateAssignment returns id when no changes", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      const assignmentId = await seedAssignment(t, classroomId);
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      const res = await t.mutation(
        api.web.teacherAssignments.updateAssignment,
        { assignmentId },
      );
      expect(res).toBe(assignmentId);
    });
  });

  describe("deleteAssignment", () => {
    // Deleting an assignment cascades to submissions and their flags, and removes it from the classroom.
    it("deletes submissions/flags and removes assignment from classroom", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      const assignmentId = await seedAssignment(t, classroomId);
      const flagId = await seedFlag(t);
      await seedSubmission(t, {
        assignmentId,
        studentId: "student_1",
        flags: [flagId],
      });

      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });
      await t.mutation(api.web.teacherAssignments.deleteAssignment, {
        assignmentId,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const counts = await t.run(async (ctx: any) => {
        const classroom = await ctx.db.get(classroomId);
        const assignments = await ctx.db.query("assignments").collect();
        const submissions = await ctx.db.query("submissions").collect();
        const flags = await ctx.db.query("flags").collect();
        return {
          classroomAssignments: classroom.assignments.length,
          assignments: assignments.length,
          submissions: submissions.length,
          flags: flags.length,
        };
      });

      expect(counts).toEqual({
        classroomAssignments: 0,
        assignments: 0,
        submissions: 0,
        flags: 0,
      });
    });
  });

  describe("submission grading + feedback", () => {
    // Persists grade, grader id, and gradedAt timestamp.
    it("gradeSubmission patches grade/gradedBy/gradedAt", async () => {
      const t = makeTestClient();
      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(999);
      await seedUserRole(t, "teacher_1", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      const assignmentId = await seedAssignment(t, classroomId);
      const submissionId = await seedSubmission(t, {
        assignmentId,
        studentId: "student_1",
      });
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      await t.mutation(api.web.teacherAssignments.gradeSubmission, {
        submissionId,
        grade: 77,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = await t.run(async (ctx: any) => ctx.db.get(submissionId));
      expect(sub.grade).toBe(77);
      expect(sub.gradedBy).toBe("teacher_1");
      expect(sub.gradedAt).toBe(999);

      nowSpy.mockRestore();
    });

    // Persists teacher feedback text to the submission.
    it("provideSubmissionFeedback patches submissionFeedback", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      const assignmentId = await seedAssignment(t, classroomId);
      const submissionId = await seedSubmission(t, {
        assignmentId,
        studentId: "student_1",
      });
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      await t.mutation(api.web.teacherAssignments.provideSubmissionFeedback, {
        submissionId,
        feedback: "hi",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = await t.run(async (ctx: any) => ctx.db.get(submissionId));
      expect(sub.submissionFeedback).toBe("hi");
    });
  });

  describe("flags", () => {
    // Creates a flag record and adds it to the submission.flags array.
    it("createFlag inserts flag and adds to submission", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      const assignmentId = await seedAssignment(t, classroomId);
      const submissionId = await seedSubmission(t, {
        assignmentId,
        studentId: "student_1",
      });
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      const flagId = await t.mutation(api.web.teacherAssignments.createFlag, {
        submissionId,
        type: "plagiarism",
        description: "similar",
      });
      expect(flagId).toBeTruthy();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = await t.run(async (ctx: any) => ctx.db.get(submissionId));
      expect(sub.flags).toContain(flagId);
    });

    // Fetches all flag documents referenced by a submission.
    it("getFlagsBySubmission returns flags", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      const assignmentId = await seedAssignment(t, classroomId);
      const flagId = await seedFlag(t, { type: "x" });
      const submissionId = await seedSubmission(t, {
        assignmentId,
        studentId: "student_1",
        flags: [flagId],
      });
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      const flags = await t.query(
        api.web.teacherAssignments.getFlagsBySubmission,
        { submissionId },
      );
      expect(flags.map((f) => f._id)).toEqual([flagId]);
    });

    // Prevents deleting a flag that isn't attached to the submission.
    it("deleteFlag errors if flag does not belong to submission", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      const assignmentId = await seedAssignment(t, classroomId);
      const flag1 = await seedFlag(t, { type: "a" });
      const flag2 = await seedFlag(t, { type: "b" });
      const submissionId = await seedSubmission(t, {
        assignmentId,
        studentId: "student_1",
        flags: [flag1],
      });
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      await expect(
        t.mutation(api.web.teacherAssignments.deleteFlag, {
          submissionId,
          flagId: flag2,
        }),
      ).rejects.toThrow(
        "Failed to delete flag: flag does not belong to submission",
      );
    });

    // Deletes the flag document and removes it from submission.flags.
    it("deleteFlag removes flag and updates submission", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      const assignmentId = await seedAssignment(t, classroomId);
      const flagId = await seedFlag(t, { type: "a" });
      const submissionId = await seedSubmission(t, {
        assignmentId,
        studentId: "student_1",
        flags: [flagId],
      });
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      await t.mutation(api.web.teacherAssignments.deleteFlag, {
        submissionId,
        flagId,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const after = await t.run(async (ctx: any) => {
        const sub = await ctx.db.get(submissionId);
        const flag = await ctx.db.get(flagId);
        return { flags: sub.flags, flagExists: !!flag };
      });
      expect(after.flags).toEqual([]);
      expect(after.flagExists).toBe(false);
    });
  });

  describe("stats", () => {
    // Computes assignment-level submission totals and submissionRate.
    it("getAssignmentSubmissionStats returns totals + rate", async () => {
      const t = makeTestClient();
      await seedUserRole(t, "teacher_1", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      const assignmentId = await seedAssignment(t, classroomId);
      await seedEnrollment(t, classroomId, "s1");
      await seedEnrollment(t, classroomId, "s2");
      await seedSubmission(t, { assignmentId, studentId: "s1" });
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      const res = await t.query(
        api.web.teacherAssignments.getAssignmentSubmissionStats,
        {
          assignmentId,
        },
      );
      expect(res).toEqual({
        totalStudents: 2,
        totalSubmissions: 1,
        submissionRate: 0.5,
      });
    });

    // Returns an empty object when no assignments are past due.
    it("getClassroomSubmissionStats returns {} when none past due", async () => {
      const t = makeTestClient();
      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(100);
      await seedUserRole(t, "teacher_1", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      await seedAssignment(t, classroomId, {
        dueDate: 200,
        releaseDate: 1,
        name: "Future",
      });
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      const res = await t.query(
        api.web.teacherAssignments.getClassroomSubmissionStats,
        {
          classroomId,
        },
      );
      expect(res).toEqual({});

      nowSpy.mockRestore();
    });

    // Returns submission stats only for assignments whose dueDate has passed.
    it("getClassroomSubmissionStats returns stats for past due assignments", async () => {
      const t = makeTestClient();
      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(100);
      await seedUserRole(t, "teacher_1", "teacher");
      const classroomId = await seedClassroom(t, { ownerId: "teacher_1" });
      const aPast = await seedAssignment(t, classroomId, {
        name: "Past",
        dueDate: 50,
        releaseDate: 1,
      });
      const aFuture = await seedAssignment(t, classroomId, {
        name: "Future",
        dueDate: 150,
        releaseDate: 1,
      });
      await seedEnrollment(t, classroomId, "s1");
      await seedEnrollment(t, classroomId, "s2");
      await seedSubmission(t, { assignmentId: aPast, studentId: "s1" });
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      const res = await t.query(
        api.web.teacherAssignments.getClassroomSubmissionStats,
        {
          classroomId,
        },
      );

      // Only past-due assignment appears.
      expect(Object.keys(res as any).length).toBe(1);
      const stat = (res as any)[aPast];
      expect(stat).toMatchObject({
        assignmentId: aPast,
        assignmentName: "Past",
        submissions: 1,
        submissionRate: 0.5,
      });
      expect((res as any)[aFuture]).toBeUndefined();

      nowSpy.mockRestore();
    });
  });
});
