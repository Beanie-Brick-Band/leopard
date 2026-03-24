import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "../../convex/_generated/api";
import * as apiModule from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { MutationCtx, QueryCtx } from "../../convex/_generated/server";
import schema from "../../convex/schema";
import {
  seedAssignment,
  seedClassroom,
  seedEnrollment,
  seedSubmission,
  seedUserRole,
  seedWorkspace,
} from "../helpers/seed";

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
    "convex/web/submission.ts": () => import("../../convex/web/submission"),
  };
  return convexTest(schema, modules);
}

async function seedClassroomAndAssignment(
  t: ReturnType<typeof makeTestClient>,
  opts: {
    ownerId?: string;
    assistantIds?: string[];
    dueDate?: number;
    releaseDate?: number;
  } = {},
) {
  const classroomId = await seedClassroom(t, {
    ownerId: opts.ownerId ?? "teacher_1",
    assistantIds: opts.assistantIds,
  });
  const assignmentId = await seedAssignment(t, classroomId, {
    name: "A1",
    releaseDate: opts.releaseDate ?? 1,
    dueDate: opts.dueDate ?? 10,
  });
  return { classroomId, assignmentId };
}

async function seedTestWorkspace(
  t: ReturnType<typeof makeTestClient>,
  assignmentId: Parameters<typeof seedWorkspace>[1]["assignmentId"],
  userId: string,
) {
  return seedWorkspace(t, {
    assignmentId,
    userId,
    coderWorkspaceId: `ws_${userId}`,
    isActive: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("web/submission", () => {
  describe("gradeSubmission / provideSubmissionFeedback", () => {
    it("denies grader who is not owner/assistant", async () => {
      const t = makeTestClient();
      const { classroomId, assignmentId } = await seedClassroomAndAssignment(
        t,
        {
          ownerId: "teacher_owner",
        },
      );
      await seedEnrollment(t, classroomId, "student_1");
      const workspaceId = await seedTestWorkspace(t, assignmentId, "student_1");
      const submissionId = await seedSubmission(t, {
        assignmentId,
        studentId: "student_1",
        workspaceId,
      });

      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_other",
        email: "t@example.com",
      });

      await expect(
        t.mutation(api.web.submission.gradeSubmission, {
          submissionId,
          grade: 95,
        }),
      ).rejects.toThrow(
        "Insufficient permissions to provide feedback on this submission",
      );
    });

    it("grades and provides feedback for classroom owner", async () => {
      const t = makeTestClient();
      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(123);
      const { classroomId, assignmentId } = await seedClassroomAndAssignment(
        t,
        {
          ownerId: "teacher_owner",
        },
      );
      await seedEnrollment(t, classroomId, "student_1");
      const workspaceId = await seedTestWorkspace(t, assignmentId, "student_1");
      const submissionId = await seedSubmission(t, {
        assignmentId,
        studentId: "student_1",
        workspaceId,
      });

      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_owner",
        email: "o@example.com",
      });

      await t.mutation(api.web.submission.gradeSubmission, {
        submissionId,
        grade: 88.5,
      });
      await t.mutation(api.web.submission.provideSubmissionFeedback, {
        submissionId,
        feedback: "Nice work",
      });

      const saved = await t.run(async (ctx: QueryCtx) =>
        ctx.db.get(submissionId),
      );
      if (!saved) {
        throw new Error("Expected graded submission to exist");
      }
      expect(saved.grade).toBe(88.5);
      expect(saved.gradedBy).toBe("teacher_owner");
      expect(saved.gradedAt).toBe(123);
      expect(saved.submissionFeedback).toBe("Nice work");

      nowSpy.mockRestore();
    });
  });

  describe("getOwnSubmissionsForAssignment", () => {
    it("returns {success:false} when no submission", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedClassroomAndAssignment(t);
      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "s@example.com",
      });

      const res = await t.query(
        api.web.submission.getOwnSubmissionsForAssignment,
        {
          assignmentId,
        },
      );
      expect(res).toEqual({ success: false });
    });

    it("hides grade/feedback when grades not released", async () => {
      const t = makeTestClient();
      const { classroomId, assignmentId } = await seedClassroomAndAssignment(t);
      await seedEnrollment(t, classroomId, "student_1");
      const workspaceId = await seedTestWorkspace(t, assignmentId, "student_1");
      await seedSubmission(t, {
        assignmentId,
        studentId: "student_1",
        workspaceId,
        grade: 100,
        feedback: "great",
        gradesReleased: false,
      });
      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "s@example.com",
      });

      const res = await t.query(
        api.web.submission.getOwnSubmissionsForAssignment,
        {
          assignmentId,
        },
      );

      expect(res.success).toBe(true);
      expect(res.submission).toMatchObject({
        studentId: "student_1",
        assignmentId,
        workspaceId,
        gradesReleased: false,
      });
      expect((res.submission as Doc<"submissions">).grade).toBeUndefined();
      expect(
        (res.submission as Doc<"submissions">).submissionFeedback,
      ).toBeUndefined();
    });

    it("returns full submission when grades released", async () => {
      const t = makeTestClient();
      const { classroomId, assignmentId } = await seedClassroomAndAssignment(t);
      await seedEnrollment(t, classroomId, "student_1");
      const workspaceId = await seedTestWorkspace(t, assignmentId, "student_1");
      await seedSubmission(t, {
        assignmentId,
        studentId: "student_1",
        workspaceId,
        grade: 91,
        feedback: "ok",
        gradesReleased: true,
      });

      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "s@example.com",
      });
      const res = await t.query(
        api.web.submission.getOwnSubmissionsForAssignment,
        {
          assignmentId,
        },
      );

      expect(res.success).toBe(true);
      expect((res.submission as Doc<"submissions">).grade).toBe(91);
      expect((res.submission as Doc<"submissions">).submissionFeedback).toBe(
        "ok",
      );
    });
  });

  describe("getAllSubmissionsForAssignment", () => {
    it("denies non-owner/assistant", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedClassroomAndAssignment(t, {
        ownerId: "teacher_1",
      });
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_2",
        email: "t2@example.com",
      });

      await expect(
        t.query(api.web.submission.getAllSubmissionsForAssignment, {
          assignmentId,
        }),
      ).rejects.toThrow(
        "Insufficient permissions to provide feedback on this submission",
      );
    });

    it("returns all submissions for assignment to owner", async () => {
      const t = makeTestClient();
      const { classroomId, assignmentId } = await seedClassroomAndAssignment(
        t,
        {
          ownerId: "teacher_1",
        },
      );
      await seedEnrollment(t, classroomId, "student_1");
      await seedEnrollment(t, classroomId, "student_2");
      const ws1 = await seedTestWorkspace(t, assignmentId, "student_1");
      const ws2 = await seedTestWorkspace(t, assignmentId, "student_2");
      await seedSubmission(t, {
        assignmentId,
        studentId: "student_1",
        workspaceId: ws1,
      });
      await seedSubmission(t, {
        assignmentId,
        studentId: "student_2",
        workspaceId: ws2,
      });

      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });
      const res = await t.query(
        api.web.submission.getAllSubmissionsForAssignment,
        {
          assignmentId,
        },
      );
      expect(res.length).toBe(2);
      expect(res.map((s) => s.studentId).sort()).toEqual(
        ["student_1", "student_2"].sort(),
      );
    });
  });

  describe("internalSubmitAssignment", () => {
    it("denies non-student role", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedClassroomAndAssignment(t);
      const workspaceId = await seedTestWorkspace(
        t,
        assignmentId,
        "teacher_1",
      );
      await seedUserRole(t, "teacher_1", "teacher");

      await expect(
        t.mutation(internal.web.submission.internalSubmitAssignment, {
          assignmentId,
          studentId: "teacher_1",
          workspaceId,
        }),
      ).rejects.toThrow(
        "Only students can submit and view their own submissions",
      );
    });

    it("throws Assignment not found for invalid id", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedClassroomAndAssignment(t);
      const workspaceId = await seedTestWorkspace(
        t,
        assignmentId,
        "student_1",
      );

      const deletedId = await t.run(async (ctx: MutationCtx) => {
        await ctx.db.delete(assignmentId);
        return assignmentId;
      });

      await expect(
        t.mutation(internal.web.submission.internalSubmitAssignment, {
          assignmentId: deletedId,
          studentId: "student_1",
          workspaceId,
        }),
      ).rejects.toThrow("Assignment not found");
    });

    it("throws when student is not enrolled", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedClassroomAndAssignment(t);
      const workspaceId = await seedTestWorkspace(
        t,
        assignmentId,
        "student_1",
      );

      await expect(
        t.mutation(internal.web.submission.internalSubmitAssignment, {
          assignmentId,
          studentId: "student_1",
          workspaceId,
        }),
      ).rejects.toThrow("Not authorized to view this assignment");
    });

    it("throws when submitting after due date", async () => {
      const t = makeTestClient();
      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(100);
      const { classroomId, assignmentId } =
        await seedClassroomAndAssignment(t, { dueDate: 50 });
      await seedEnrollment(t, classroomId, "student_1");
      const workspaceId = await seedTestWorkspace(
        t,
        assignmentId,
        "student_1",
      );

      await expect(
        t.mutation(internal.web.submission.internalSubmitAssignment, {
          assignmentId,
          studentId: "student_1",
          workspaceId,
        }),
      ).rejects.toThrow("Cannot submit after the due date");

      nowSpy.mockRestore();
    });

    it("throws when submission already confirmed", async () => {
      const t = makeTestClient();
      vi.spyOn(Date, "now").mockReturnValue(5);
      const { classroomId, assignmentId } =
        await seedClassroomAndAssignment(t, { dueDate: 10 });
      await seedEnrollment(t, classroomId, "student_1");
      const workspaceId = await seedTestWorkspace(
        t,
        assignmentId,
        "student_1",
      );

      // Seed a confirmed submission (has submissionStorageKey)
      await t.run(async (ctx: MutationCtx) => {
        await ctx.db.insert("submissions", {
          assignmentId,
          studentId: "student_1",
          workspaceId,
          flags: [],
          flagged: false,
          submittedAt: 3,
          gradesReleased: false,
          submissionStorageKey: "some-key",
        });
      });

      await expect(
        t.mutation(internal.web.submission.internalSubmitAssignment, {
          assignmentId,
          studentId: "student_1",
          workspaceId,
        }),
      ).rejects.toThrow("Assignment already submitted");
    });

    it("creates a new submission without storage key", async () => {
      const t = makeTestClient();
      vi.spyOn(Date, "now").mockReturnValue(5);
      const { classroomId, assignmentId } =
        await seedClassroomAndAssignment(t, { dueDate: 10 });
      await seedEnrollment(t, classroomId, "student_1");
      const workspaceId = await seedTestWorkspace(
        t,
        assignmentId,
        "student_1",
      );

      const submissionId = await t.mutation(
        internal.web.submission.internalSubmitAssignment,
        {
          assignmentId,
          studentId: "student_1",
          workspaceId,
        },
      );

      const saved = await t.run(async (ctx: QueryCtx) =>
        ctx.db.get(submissionId),
      );
      expect(saved).not.toBeNull();
      expect(saved!.submissionStorageKey).toBeUndefined();
      expect(saved!.studentId).toBe("student_1");
      expect(saved!.assignmentId).toBe(assignmentId);
      expect(saved!.workspaceId).toBe(workspaceId);
      expect(saved!.gradesReleased).toBe(false);
    });

    it("deletes stale submission and creates a new one on retry", async () => {
      const t = makeTestClient();
      vi.spyOn(Date, "now").mockReturnValue(5);
      const { classroomId, assignmentId } =
        await seedClassroomAndAssignment(t, { dueDate: 1000000 });
      await seedEnrollment(t, classroomId, "student_1");
      const ws1 = await seedTestWorkspace(t, assignmentId, "student_1");
      const ws2 = await seedTestWorkspace(t, assignmentId, "student_1_v2");
      const existingId = await seedSubmission(t, {
        assignmentId,
        studentId: "student_1",
        workspaceId: ws1,
      });

      const returnedId = await t.mutation(
        internal.web.submission.internalSubmitAssignment,
        {
          assignmentId,
          studentId: "student_1",
          workspaceId: ws2,
        },
      );

      // Old record should be deleted
      const old = await t.run(async (ctx: QueryCtx) =>
        ctx.db.get(existingId),
      );
      expect(old).toBeNull();

      // New record should exist with the new workspace
      const saved = await t.run(async (ctx: QueryCtx) =>
        ctx.db.get(returnedId),
      );
      expect(saved).not.toBeNull();
      expect(saved!.workspaceId).toBe(ws2);
      expect(saved!.submissionStorageKey).toBeUndefined();
    });
  });

  describe("internalConfirmSubmission", () => {
    it("sets storage key and updates submittedAt", async () => {
      const t = makeTestClient();
      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(999);
      const { assignmentId } = await seedClassroomAndAssignment(t);
      const workspaceId = await seedTestWorkspace(
        t,
        assignmentId,
        "student_1",
      );
      const submissionId = await seedSubmission(t, {
        assignmentId,
        studentId: "student_1",
        workspaceId,
      });

      await t.mutation(internal.web.submission.internalConfirmSubmission, {
        submissionId,
        submissionStorageKey: "classrooms/c1/assignments/a1/student_1.zip",
      });

      const saved = await t.run(async (ctx: QueryCtx) =>
        ctx.db.get(submissionId),
      );
      expect(saved!.submissionStorageKey).toBe(
        "classrooms/c1/assignments/a1/student_1.zip",
      );
      expect(saved!.submittedAt).toBe(999);

      nowSpy.mockRestore();
    });
  });

  describe("internalFailSubmission", () => {
    it("deletes the submission", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedClassroomAndAssignment(t);
      const workspaceId = await seedTestWorkspace(
        t,
        assignmentId,
        "student_1",
      );
      const submissionId = await seedSubmission(t, {
        assignmentId,
        studentId: "student_1",
        workspaceId,
      });

      await t.mutation(internal.web.submission.internalFailSubmission, {
        submissionId,
      });

      const saved = await t.run(async (ctx: QueryCtx) =>
        ctx.db.get(submissionId),
      );
      expect(saved).toBeNull();
    });
  });
});
