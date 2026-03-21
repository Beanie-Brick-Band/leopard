import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../../convex/_generated/api";
import * as apiModule from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { QueryCtx } from "../../convex/_generated/server";
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
});
