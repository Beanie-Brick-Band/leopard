import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../_generated/api";
import * as apiModule from "../_generated/api";
import schema from "../schema";
import {
  seedAssignment,
  seedClassroom,
  seedEnrollment,
  seedSubmission,
  seedUserRole,
  seedWorkspace,
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
    "convex/web/submission.ts": () => import("../web/submission"),
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
  userId: string,
) {
  return seedWorkspace(t, {
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
  describe("submitAssignment", () => {
    // Requires an authenticated user before allowing a submission.
    it("throws Not authenticated when not logged in", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedClassroomAndAssignment(t);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workspaceId = await seedTestWorkspace(t, "student_1");
      safeGetAuthUser.mockResolvedValue(null);

      await expect(
        t.mutation(api.web.submission.submitAssignment, {
          assignmentId,
          workspaceId,
        }),
      ).rejects.toThrow("Not authenticated");
    });

    // Ensures only users with the student role can submit assignments.
    it("denies non-student", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedClassroomAndAssignment(t);
      const workspaceId = await seedTestWorkspace(t, "teacher_1");
      await seedUserRole(t, "teacher_1", "teacher");
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      await expect(
        t.mutation(api.web.submission.submitAssignment, {
          assignmentId,
          workspaceId,
        }),
      ).rejects.toThrow(
        "Only students can submit and view their own submissions",
      );
    });

    // Throws a not-found error when a valid assignment id no longer exists.
    it("throws Assignment not found", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedClassroomAndAssignment(t, {
        dueDate: 1000000,
      });
      const workspaceId = await seedTestWorkspace(t, "student_1");
      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "s@example.com",
      });

      // Delete the assignment so the ID is valid but missing.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fakeId = await t.run(async (ctx: any) => {
        await ctx.db.delete(assignmentId);
        return assignmentId;
      });
      await expect(
        t.mutation(api.web.submission.submitAssignment, {
          assignmentId: fakeId,
          workspaceId,
        }),
      ).rejects.toThrow("Assignment not found");
    });

    // Rejects submissions from students who are not enrolled in the classroom.
    it("throws User not enrolled in the classroom", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedClassroomAndAssignment(t);
      const workspaceId = await seedTestWorkspace(t, "student_1");
      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "s@example.com",
      });

      await expect(
        t.mutation(api.web.submission.submitAssignment, {
          assignmentId,
          workspaceId,
        }),
      ).rejects.toThrow("User not enrolled in the classroom");
    });

    // Prevents submissions after the assignment due date.
    it("throws Cannot submit after the due date", async () => {
      const t = makeTestClient();
      const nowSpy = vi.spyOn(Date, "now").mockReturnValue(100);
      const { classroomId, assignmentId } = await seedClassroomAndAssignment(
        t,
        {
          dueDate: 50,
        },
      );
      await seedEnrollment(t, classroomId, "student_1");
      const workspaceId = await seedTestWorkspace(t, "student_1");
      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "s@example.com",
      });

      await expect(
        t.mutation(api.web.submission.submitAssignment, {
          assignmentId,
          workspaceId,
        }),
      ).rejects.toThrow("Cannot submit after the due date");

      nowSpy.mockRestore();
    });

    // Creates a new submission record when the student hasn't submitted yet.
    it("creates a new submission", async () => {
      const t = makeTestClient();
      vi.spyOn(Date, "now").mockReturnValue(5);
      const { classroomId, assignmentId } = await seedClassroomAndAssignment(
        t,
        {
          dueDate: 10,
        },
      );
      await seedEnrollment(t, classroomId, "student_1");
      const workspaceId = await seedTestWorkspace(t, "student_1");
      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "s@example.com",
      });

      const res = await t.mutation(api.web.submission.submitAssignment, {
        assignmentId,
        workspaceId,
      });
      expect(res.submissionId).toBeTruthy();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const saved = await t.run(async (ctx: any) =>
        ctx.db.get(res.submissionId),
      );
      expect(saved.studentId).toBe("student_1");
      expect(saved.assignmentId).toBe(assignmentId);
      expect(saved.workspaceId).toBe(workspaceId);
      expect(saved.gradesReleased).toBe(false);
    });

    // Updates the existing submission when the student submits again.
    it("updates an existing submission", async () => {
      const t = makeTestClient();
      const nowSpy = vi
        .spyOn(Date, "now")
        .mockReturnValueOnce(5)
        .mockReturnValueOnce(6)
        .mockReturnValue(6);
      const { classroomId, assignmentId } = await seedClassroomAndAssignment(
        t,
        {
          dueDate: 1000000,
        },
      );
      await seedEnrollment(t, classroomId, "student_1");
      const workspace1Id = await seedTestWorkspace(t, "student_1");
      const workspace2Id = await seedTestWorkspace(t, "student_1_2");
      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "s@example.com",
      });

      const first = await t.mutation(api.web.submission.submitAssignment, {
        assignmentId,
        workspaceId: workspace1Id,
      });

      const second = await t.mutation(api.web.submission.submitAssignment, {
        assignmentId,
        workspaceId: workspace2Id,
      });

      expect(second.submissionId).toBe(first.submissionId);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated = await t.run(async (ctx: any) =>
        ctx.db.get(first.submissionId),
      );
      expect(updated.workspaceId).toBe(workspace2Id);
      expect(updated.submittedAt).toBe(6);

      nowSpy.mockRestore();
    });
  });

  describe("gradeSubmission / provideSubmissionFeedback", () => {
    // Ensures graders must be classroom owner or assistant.
    it("denies grader who is not owner/assistant", async () => {
      const t = makeTestClient();
      const { classroomId, assignmentId } = await seedClassroomAndAssignment(
        t,
        {
          ownerId: "teacher_owner",
        },
      );
      await seedEnrollment(t, classroomId, "student_1");
      const workspaceId = await seedTestWorkspace(t, "student_1");
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

    // Verifies authorized graders can patch grade and feedback fields.
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
      const workspaceId = await seedTestWorkspace(t, "student_1");
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const saved = await t.run(async (ctx: any) => ctx.db.get(submissionId));
      expect(saved.grade).toBe(88.5);
      expect(saved.gradedBy).toBe("teacher_owner");
      expect(saved.gradedAt).toBe(123);
      expect(saved.submissionFeedback).toBe("Nice work");

      nowSpy.mockRestore();
    });
  });

  describe("getOwnSubmissionsForAssignment", () => {
    // Returns success=false when the student has not submitted yet.
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

    // Hides grade/feedback until grades are released.
    it("hides grade/feedback when grades not released", async () => {
      const t = makeTestClient();
      const { classroomId, assignmentId } = await seedClassroomAndAssignment(t);
      await seedEnrollment(t, classroomId, "student_1");
      const workspaceId = await seedTestWorkspace(t, "student_1");
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
      expect((res.submission as any).grade).toBeUndefined();
      expect((res.submission as any).submissionFeedback).toBeUndefined();
    });

    // Returns the full submission once grades are released.
    it("returns full submission when grades released", async () => {
      const t = makeTestClient();
      const { classroomId, assignmentId } = await seedClassroomAndAssignment(t);
      await seedEnrollment(t, classroomId, "student_1");
      const workspaceId = await seedTestWorkspace(t, "student_1");
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
      expect((res.submission as any).grade).toBe(91);
      expect((res.submission as any).submissionFeedback).toBe("ok");
    });
  });

  describe("getAllSubmissionsForAssignment", () => {
    // Ensures non-owner/assistant users cannot list all submissions for an assignment.
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

    // Returns all submissions for an assignment to authorized graders.
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
      const ws1 = await seedTestWorkspace(t, "student_1");
      const ws2 = await seedTestWorkspace(t, "student_2");
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
