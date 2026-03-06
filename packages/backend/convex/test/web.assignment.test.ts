import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "../_generated/api";
import * as apiModule from "../_generated/api";
import schema from "../schema";
import {
  seedAssignment as seedAssignmentDoc,
  seedClassroom,
  seedEnrollment,
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

const coderSdkMocks = vi.hoisted(() => ({
  activateUserAccount: vi.fn(),
  createNewSessionKey: vi.fn(),
  createNewUser: vi.fn(),
  createUserWorkspace: vi.fn(),
  createWorkspaceBuild: vi.fn(),
  getOrganizations: vi.fn(),
  getTemplatesByOrganization: vi.fn(),
  getUserByName: vi.fn(),
  getWorkspaceMetadataByUserAndWorkspaceName: vi.fn(),
  listWorkspaces: vi.fn(),
}));
vi.mock("@package/coder-sdk", () => ({
  activateUserAccount: coderSdkMocks.activateUserAccount,
  createNewSessionKey: coderSdkMocks.createNewSessionKey,
  createNewUser: coderSdkMocks.createNewUser,
  createUserWorkspace: coderSdkMocks.createUserWorkspace,
  createWorkspaceBuild: coderSdkMocks.createWorkspaceBuild,
  getOrganizations: coderSdkMocks.getOrganizations,
  getTemplatesByOrganization: coderSdkMocks.getTemplatesByOrganization,
  getUserByName: coderSdkMocks.getUserByName,
  getWorkspaceMetadataByUserAndWorkspaceName:
    coderSdkMocks.getWorkspaceMetadataByUserAndWorkspaceName,
  listWorkspaces: coderSdkMocks.listWorkspaces,
}));

const coderClientMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));
vi.mock("@package/coder-sdk/client", () => ({
  createClient: coderClientMocks.createClient,
}));

const safeGetAuthUser = authMocks.safeGetAuthUser;
const activateUserAccount = coderSdkMocks.activateUserAccount;
const createNewSessionKey = coderSdkMocks.createNewSessionKey;
const createNewUser = coderSdkMocks.createNewUser;
const createUserWorkspace = coderSdkMocks.createUserWorkspace;
const createWorkspaceBuild = coderSdkMocks.createWorkspaceBuild;
const getOrganizations = coderSdkMocks.getOrganizations;
const getTemplatesByOrganization = coderSdkMocks.getTemplatesByOrganization;
const getUserByName = coderSdkMocks.getUserByName;
const getWorkspaceMetadataByUserAndWorkspaceName =
  coderSdkMocks.getWorkspaceMetadataByUserAndWorkspaceName;
const listWorkspaces = coderSdkMocks.listWorkspaces;
const createClient = coderClientMocks.createClient;

function makeTestClient() {
  const modules: Record<string, () => Promise<unknown>> = {
    "convex/_generated/api.ts": () => Promise.resolve(apiModule),
    "convex/web/assignment.ts": () => import("../web/assignment"),
  };
  return convexTest(schema, modules);
}

async function seedAssignment(
  t: ReturnType<typeof makeTestClient>,
  opts: {
    ownerId?: string;
    assistantIds?: string[];
    studentRelationIds?: string[];
  } = {},
) {
  const ownerId = opts.ownerId ?? "owner_1";
  const assistantIds = opts.assistantIds ?? [];
  const studentRelationIds = opts.studentRelationIds ?? [];

  const classroomId = await seedClassroom(t, {
    className: "Test Class",
    metadata: "{}",
    ownerId,
    assistantIds,
  });

  const assignmentId = await seedAssignmentDoc(t, classroomId, {
    name: "Test Assignment",
    releaseDate: 1,
    dueDate: 2,
  });

  for (const studentId of studentRelationIds) {
    await seedEnrollment(t, classroomId, studentId);
  }

  return { classroomId, assignmentId };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CODER_API_URL;
  delete process.env.CODER_API_KEY;
});

describe("web/assignment", () => {
  describe("getById / getByIds access control", () => {
    // Blocks assignment reads when there is no authenticated user.
    it("throws Unauthorized when not logged in", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedAssignment(t);
      safeGetAuthUser.mockResolvedValue(null);

      await expect(
        t.query(api.web.assignment.getById, { id: assignmentId }),
      ).rejects.toThrow("Unauthorized");
    });

    // Allows the classroom owner to access the assignment.
    it("allows classroom owner", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedAssignment(t, { ownerId: "owner_1" });
      safeGetAuthUser.mockResolvedValue({
        _id: "owner_1",
        email: "o@example.com",
      });

      const assignment = await t.query(api.web.assignment.getById, {
        id: assignmentId,
      });
      expect(assignment?._id).toBe(assignmentId);
    });

    // Allows classroom assistants to access the assignment.
    it("allows classroom assistant", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedAssignment(t, {
        assistantIds: ["assistant_1"],
      });
      safeGetAuthUser.mockResolvedValue({
        _id: "assistant_1",
        email: "a@example.com",
      });

      const assignment = await t.query(api.web.assignment.getById, {
        id: assignmentId,
      });
      expect(assignment?._id).toBe(assignmentId);
    });

    // Allows enrolled students to access the assignment.
    it("allows enrolled student", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedAssignment(t, {
        studentRelationIds: ["student_1"],
      });
      safeGetAuthUser.mockResolvedValue({
        _id: "student_1",
        email: "s@example.com",
      });

      const assignment = await t.query(api.web.assignment.getById, {
        id: assignmentId,
      });
      expect(assignment?._id).toBe(assignmentId);
    });

    // Denies access to students who are not enrolled in the classroom.
    it("denies non-enrolled student", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedAssignment(t);
      safeGetAuthUser.mockResolvedValue({
        _id: "student_2",
        email: "s2@example.com",
      });

      await expect(
        t.query(api.web.assignment.getById, { id: assignmentId }),
      ).rejects.toThrow("Not authorized to view this assignment");
    });

    // Ensures teacher role alone does not grant assignment access.
    it("denies teacher who is not owner/assistant", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedAssignment(t);
      await seedUserRole(t, "teacher_1", "teacher");
      safeGetAuthUser.mockResolvedValue({
        _id: "teacher_1",
        email: "t@example.com",
      });

      await expect(
        t.query(api.web.assignment.getById, { id: assignmentId }),
      ).rejects.toThrow("Not authorized to view this assignment");
    });

    // Ensures admin role alone does not grant assignment access.
    it("denies admin who is not owner/assistant", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedAssignment(t);
      await seedUserRole(t, "admin_1", "admin");
      safeGetAuthUser.mockResolvedValue({
        _id: "admin_1",
        email: "ad@example.com",
      });

      await expect(
        t.query(api.web.assignment.getById, { id: assignmentId }),
      ).rejects.toThrow("Not authorized to view this assignment");
    });

    // Throws a clear error when the assignment id does not exist.
    it("throws Assignment not found", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedAssignment(t, { ownerId: "owner_1" });
      safeGetAuthUser.mockResolvedValue({
        _id: "owner_1",
        email: "o@example.com",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await t.run(async (ctx: any) => {
        await ctx.db.delete(assignmentId);
      });

      await expect(
        t.query(api.web.assignment.getById, { id: assignmentId }),
      ).rejects.toThrow("Assignment not found");
    });

    // Throws a clear error when the assignment's classroom is missing.
    it("throws Classroom not found", async () => {
      const t = makeTestClient();
      const { classroomId, assignmentId } = await seedAssignment(t, {
        ownerId: "owner_1",
      });
      safeGetAuthUser.mockResolvedValue({
        _id: "owner_1",
        email: "o@example.com",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await t.run(async (ctx: any) => {
        await ctx.db.delete(classroomId);
      });

      await expect(
        t.query(api.web.assignment.getById, { id: assignmentId }),
      ).rejects.toThrow("Classroom not found");
    });

    // Fetches multiple assignments, enforcing access checks per id.
    it("getByIds returns assignments when all are accessible", async () => {
      const t = makeTestClient();
      const seeded = await seedAssignment(t, { ownerId: "owner_1" });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const assignment2Id = await t.run(async (ctx: any) => {
        const a2 = await ctx.db.insert("assignments", {
          classroomId: seeded.classroomId,
          dueDate: 3,
          releaseDate: 1,
          name: "Test Assignment 2",
        });
        await ctx.db.patch(seeded.classroomId, {
          assignments: [seeded.assignmentId, a2],
        });
        return a2;
      });

      safeGetAuthUser.mockResolvedValue({
        _id: "owner_1",
        email: "o@example.com",
      });

      const assignments = await t.query(api.web.assignment.getByIds, {
        ids: [seeded.assignmentId, assignment2Id],
      });
      expect(assignments.map((a) => a._id)).toEqual([
        seeded.assignmentId,
        assignment2Id,
      ]);
    });
  });

  describe("active workspace helpers", () => {
    // Blocks active-workspace lookup when unauthenticated.
    it("getMyActiveWorkspace throws Unauthorized when not logged in", async () => {
      const t = makeTestClient();
      safeGetAuthUser.mockResolvedValue(null);

      await expect(
        t.query(api.web.assignment.getMyActiveWorkspace, {}),
      ).rejects.toThrow("Unauthorized");
    });

    // Returns the user's currently active workspace.
    it("getMyActiveWorkspace returns the active workspace", async () => {
      const t = makeTestClient();
      await seedWorkspace(t, {
        userId: "u1",
        coderWorkspaceId: "ws_a",
        isActive: false,
      });
      await seedWorkspace(t, {
        userId: "u1",
        coderWorkspaceId: "ws_b",
        isActive: true,
      });
      safeGetAuthUser.mockResolvedValue({ _id: "u1", email: "u1@example.com" });

      const ws = await t.query(api.web.assignment.getMyActiveWorkspace, {});
      expect(ws?.coderWorkspaceId).toBe("ws_b");
      expect(ws?.isActive).toBe(true);
    });

    // Switches active workspace and deactivates any previously active one.
    it("setUserActiveWorkspace switches active workspace", async () => {
      const t = makeTestClient();
      await seedWorkspace(t, {
        userId: "u1",
        coderWorkspaceId: "ws_a",
        isActive: true,
      });
      await seedWorkspace(t, {
        userId: "u1",
        coderWorkspaceId: "ws_b",
        isActive: false,
      });

      await t.mutation(internal.web.assignment.setUserActiveWorkspace, {
        userId: "u1",
        coderWorkspaceId: "ws_b",
      });

      const active = await t.query(
        internal.web.assignment.getUserActiveWorkspace,
        {
          userId: "u1",
        },
      );
      expect(active?.coderWorkspaceId).toBe("ws_b");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const all = await t.run(async (ctx: any) => {
        return ctx.db
          .query("workspaces")
          .withIndex("userId_isActive", (q: any) => q.eq("userId", "u1"))
          .collect();
      });
      const wsA = all.find((w: any) => w.coderWorkspaceId === "ws_a");
      const wsB = all.find((w: any) => w.coderWorkspaceId === "ws_b");
      expect(wsA?.isActive).toBe(false);
      expect(wsB?.isActive).toBe(true);
    });

    // Inserts a workspace record when setting an active workspace that doesn't yet exist.
    it("setUserActiveWorkspace inserts workspace when missing", async () => {
      const t = makeTestClient();
      await seedWorkspace(t, {
        userId: "u1",
        coderWorkspaceId: "ws_a",
        isActive: true,
      });

      await t.mutation(internal.web.assignment.setUserActiveWorkspace, {
        userId: "u1",
        coderWorkspaceId: "ws_c",
      });

      const active = await t.query(
        internal.web.assignment.getUserActiveWorkspace,
        {
          userId: "u1",
        },
      );
      expect(active?.coderWorkspaceId).toBe("ws_c");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const all = await t.run(async (ctx: any) => {
        return ctx.db.query("workspaces").collect();
      });
      expect(all.filter((w: any) => w.userId === "u1").length).toBe(2);
    });
  });

  describe("launchWorkspace", () => {
    // Requires authentication before calling out to Coder APIs.
    it("throws Not authenticated when no user", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedAssignment(t);
      safeGetAuthUser.mockResolvedValue(null);

      await expect(
        t.action(api.web.assignment.launchWorkspace, { assignmentId }),
      ).rejects.toThrow("Not authenticated");
    });

    // Creates/starts the target workspace, stops other workspaces, stores it as active, and returns URL + session key.
    it("launches workspace, starts it, stops others, and returns URL + session key", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedAssignment(t);

      process.env.CODER_API_URL = "https://coder.example.com";
      process.env.CODER_API_KEY = "test-key";

      safeGetAuthUser.mockResolvedValue({
        _id: "user_1",
        email: "u@example.com",
      });
      createClient.mockReturnValue({});

      getUserByName
        .mockResolvedValueOnce({ data: null })
        .mockResolvedValueOnce({ data: { organization_ids: ["org_1"] } });
      getOrganizations.mockResolvedValue({ data: [{ id: "org_1" }] });
      createNewUser.mockResolvedValue({ data: {} });
      activateUserAccount.mockResolvedValue({ data: {} });
      getTemplatesByOrganization.mockResolvedValue({ data: [{ id: "tpl_1" }] });

      getWorkspaceMetadataByUserAndWorkspaceName
        .mockResolvedValueOnce({ error: { message: "not found" } })
        .mockResolvedValueOnce({
          data: {
            id: "ws_1",
            name: assignmentId,
            latest_build: { status: "stopped" },
          },
        });
      createUserWorkspace.mockResolvedValue({ data: {} });

      listWorkspaces.mockResolvedValue({
        data: {
          workspaces: [{ id: "ws_1" }, { id: "ws_2" }, { id: null }],
        },
      });

      createWorkspaceBuild.mockResolvedValue({ data: {} });
      createNewSessionKey.mockResolvedValue({ data: { key: "sess_1" } });

      const res = await t.action(api.web.assignment.launchWorkspace, {
        assignmentId,
      });
      expect(res).toEqual({
        workspaceUrl: `https://coder.example.com/@user_1/${assignmentId}.main/apps/code-server`,
        coderUserSessionKey: "sess_1",
      });

      expect(createWorkspaceBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          path: { workspace: "ws_1" },
          body: { transition: "start" },
        }),
      );
      expect(createWorkspaceBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          path: { workspace: "ws_2" },
          body: { transition: "stop" },
        }),
      );

      const active = await t.query(
        internal.web.assignment.getUserActiveWorkspace,
        {
          userId: "user_1",
        },
      );
      expect(active?.coderWorkspaceId).toBe("ws_1");
      expect(active?.isActive).toBe(true);
    });

    // Fails the action when it cannot create a Coder session key.
    it("throws when session key creation fails", async () => {
      const t = makeTestClient();
      const { assignmentId } = await seedAssignment(t);

      process.env.CODER_API_URL = "https://coder.example.com";
      process.env.CODER_API_KEY = "test-key";

      safeGetAuthUser.mockResolvedValue({
        _id: "user_1",
        email: "u@example.com",
      });
      createClient.mockReturnValue({});

      getUserByName.mockResolvedValue({
        data: { organization_ids: ["org_1"] },
      });
      activateUserAccount.mockResolvedValue({ data: {} });
      getTemplatesByOrganization.mockResolvedValue({ data: [{ id: "tpl_1" }] });
      getWorkspaceMetadataByUserAndWorkspaceName.mockResolvedValue({
        data: {
          id: "ws_1",
          name: assignmentId,
          latest_build: { status: "running" },
        },
      });
      listWorkspaces.mockResolvedValue({
        data: { workspaces: [{ id: "ws_1" }] },
      });
      createNewSessionKey.mockResolvedValue({
        error: { message: "nope" },
        data: null,
      });

      await expect(
        t.action(api.web.assignment.launchWorkspace, { assignmentId }),
      ).rejects.toThrow("Failed to create session key in Coder");
    });
  });
});
