import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  assignments: defineTable({
    classroomId: v.id("classrooms"),
    description: v.optional(v.string()),
    dueDate: v.number(),
    name: v.string(),
    releaseDate: v.number(),
    workspaceConfig: v.optional(v.record(v.string(), v.any())),
  }).index("classroomId", ["classroomId"]),
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
  }).index("workspaceId_timestamp", ["workspaceId", "timestamp"]),
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
    submissionFeedback: v.optional(v.string()),
    workspaceId: v.optional(v.id("workspaces")),
    submittedAt: v.number(),
    gradedBy: v.optional(v.string()), // map this to betterAuth user id
    gradedAt: v.optional(v.number()),
    gradesReleased: v.boolean(),
  })
  .index("studentId_assignmentId", ["studentId", "assignmentId"])
  .index("assignmentId_studentId", ["assignmentId", "studentId"])
  ,
  workspaces: defineTable({
    coderWorkspaceId: v.string(),
    isActive: v.boolean(),
    userId: v.string(), // map this to betterAuth user id
  })
    .index("coderWorkspaceId", ["coderWorkspaceId"])
    .index("userId_isActive", ["userId", "isActive"]),
  users: defineTable({
    uid: v.string(), // map this to betterAuth user id
    role: v.union(
      v.literal("admin"),
      v.literal("student"), 
      v.literal("teacher"),
    )
  }).index("uid", ["uid"]),
});
