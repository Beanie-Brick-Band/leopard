import type { Id } from "../_generated/dataModel";

export type UserRole = "admin" | "teacher" | "student";

export type TestClientLike = {
  // convex-test provides a .run helper that executes arbitrary code with a ctx.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run: <R>(fn: (ctx: any) => Promise<R>) => Promise<R>;
};

export async function seedUserRole(
  t: TestClientLike,
  userId: string,
  role: UserRole,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return t.run(async (ctx: any) => {
    await ctx.db.insert("users", { uid: userId, role });
  });
}

export async function seedClassroom(
  t: TestClientLike,
  opts: {
    className?: string;
    metadata?: string;
    ownerId: string;
    assistantIds?: string[];
    assignments?: Id<"assignments">[];
  },
): Promise<Id<"classrooms">> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return t.run(async (ctx: any) => {
    return ctx.db.insert("classrooms", {
      assignments: opts.assignments ?? [],
      className: opts.className ?? "Class",
      metadata: opts.metadata ?? "{}",
      ownerId: opts.ownerId,
      assistantIds: opts.assistantIds ?? [],
    });
  });
}

export async function seedAssignment(
  t: TestClientLike,
  classroomId: Id<"classrooms">,
  opts: {
    name?: string;
    dueDate?: number;
    releaseDate?: number;
    description?: string;
    workspaceConfig?: Record<string, unknown>;
  } = {},
): Promise<Id<"assignments">> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return t.run(async (ctx: any) => {
    const assignmentId = await ctx.db.insert("assignments", {
      classroomId,
      name: opts.name ?? "A1",
      releaseDate: opts.releaseDate ?? 1,
      dueDate: opts.dueDate ?? 2,
      description: opts.description,
      workspaceConfig: opts.workspaceConfig,
    });

    const classroom = await ctx.db.get(classroomId);
    await ctx.db.patch(classroomId, {
      assignments: [...(classroom?.assignments ?? []), assignmentId],
    });

    return assignmentId;
  });
}

export async function seedEnrollment(
  t: TestClientLike,
  classroomId: Id<"classrooms">,
  studentId: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return t.run(async (ctx: any) => {
    await ctx.db.insert("classroomStudentsRelations", {
      classroomId,
      studentId,
    });
  });
}

export async function seedWorkspace(
  t: TestClientLike,
  ws: {
    userId: string;
    coderWorkspaceId: string;
    isActive: boolean;
  },
): Promise<Id<"workspaces">> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return t.run(async (ctx: any) => {
    return ctx.db.insert("workspaces", ws);
  });
}

export async function seedFlag(
  t: TestClientLike,
  opts: { type?: string; description?: string; timestamp?: number } = {},
): Promise<Id<"flags">> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return t.run(async (ctx: any) => {
    return ctx.db.insert("flags", {
      type: opts.type ?? "t",
      description: opts.description ?? "d",
      timestamp: opts.timestamp ?? 1,
    });
  });
}

export async function seedSubmission(
  t: TestClientLike,
  opts: {
    assignmentId: Id<"assignments">;
    studentId: string;
    flags?: Id<"flags">[];
    grade?: number;
    feedback?: string;
    workspaceId?: Id<"workspaces">;
    submittedAt?: number;
    gradesReleased?: boolean;
    gradedBy?: string;
    gradedAt?: number;
  },
): Promise<Id<"submissions">> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return t.run(async (ctx: any) => {
    return ctx.db.insert("submissions", {
      assignmentId: opts.assignmentId,
      flags: opts.flags ?? [],
      grade: opts.grade,
      studentId: opts.studentId,
      submissionFeedback: opts.feedback,
      workspaceId: opts.workspaceId,
      submittedAt: opts.submittedAt ?? 1,
      gradedBy: opts.gradedBy,
      gradedAt: opts.gradedAt,
      gradesReleased: opts.gradesReleased ?? false,
    });
  });
}
