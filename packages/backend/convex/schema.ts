import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  assignments: defineTable({
    dueDate: v.string(),
    name: v.string(),
  }),
  classrooms: defineTable({
    assignments: v.array(v.id("assignments")),
    className: v.string(),
    metadata: v.string(),
    ownerId: v.string(), // map this to betterAuth user id
  }),
  classroomStudentsRelations: defineTable({
    classroomId: v.id("classrooms"),
    studentId: v.string(), // map this to betterAuth user id
  }).index("studentId_classrooms", ["studentId", "classroomId"]),
  events: defineTable({
    eventType: v.string(),
    timestamp: v.number(),
    data: v.record(v.string(), v.any()),
    workspaceId: v.id("workspaces"),
  }),
  flags: defineTable({
    description: v.string(),
    timestamp: v.number(),
    type: v.string(),
  }),
  submissions: defineTable({
    assignmentId: v.id("assignments"),
    flags: v.array(v.id("flags")),
    grade: v.float64(),
    studentId: v.string(), // map this to betterAuth user id
    submitted: v.boolean(),
    workspaceId: v.id("workspaces"),
  }),
  workspaces: defineTable({
    coderWorkspaceId: v.string(),
    userId: v.string(), // map this to betterAuth user id
  }),
});
