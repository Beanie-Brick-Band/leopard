import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  assignments: defineTable({
    classroomId: v.id("classrooms"),
    description: v.optional(v.string()),
    dueDate: v.string(),
    name: v.string(),
    releaseDate: v.string(),
    workspaceConfig: v.optional(v.record(v.string(), v.any())),
  }),
  classrooms: defineTable({
    assignments: v.array(v.id("assignments")),
    className: v.string(),
    metadata: v.string(),
    ownerId: v.string(), // map this to betterAuth user id
    assistantIds: v.array(v.string()), // map this to betterAuth user ids
  }),
  classroomStudentsRelations: defineTable({
    classroomId: v.id("classrooms"),
    studentId: v.string(), // map this to betterAuth user id
  })
  .index("studentId_classroomId", ["studentId", "classroomId"])
  .index("classroomId_studentId", ["classroomId", "studentId"]),
  events: defineTable({
    eventType: v.string(),
    timestamp: v.number(),
    workspaceId: v.id("workspaces"),
    metadata: v.record(v.string(), v.any()),
  }),
  flags: defineTable({
    description: v.string(),
    timestamp: v.number(),
    type: v.string(),
  }),
  submissions: defineTable({
    assignmentId: v.id("assignments"),
    flags: v.array(v.id("flags")),
    grade: v.optional(v.float64()),
    studentId: v.string(), // map this to betterAuth user id
    submitted: v.boolean(),
    submissionDate: v.optional(v.string()),
    submissionFeedback: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
  })
  // .index("studentId_assignmentId", ["studentId", "assignmentId"])
  .index("assignmentId_studentId", ["assignmentId", "studentId"]),
  workspaces: defineTable({
    coderWorkspaceId: v.string(),
    userId: v.string(), // map this to betterAuth user id
  }),
  users: defineTable({
    uid: v.string(), // map this to betterAuth user id
    role: v.union(
      v.literal("student"),
      v.literal("teacher"), 
      v.literal("assistant")),
  }).index("uid", ["uid"]),
});
