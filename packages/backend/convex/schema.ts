import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  assignments: defineTable({
    dueDate: v.string(),
    name: v.string(),
    description: v.string(),
    classroomId: v.id("classrooms"),
    templateId: v.optional(v.string()), // Coder template ID
    createdAt: v.number(),
  }).index("by_classroom", ["classroomId"]),
  classrooms: defineTable({
    className: v.string(),
    description: v.string(),
    ownerId: v.string(), // map this to betterAuth user id
    createdAt: v.number(),
    enrollmentRequiresApproval: v.boolean(),
  }).index("by_owner", ["ownerId"]),
  classroomStudentsRelations: defineTable({
    classroomId: v.id("classrooms"),
    studentId: v.string(), // map this to betterAuth user id
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    enrolledAt: v.number(),
  })
    .index("by_student", ["studentId"])
    .index("by_classroom", ["classroomId"])
    .index("by_student_classroom", ["studentId", "classroomId"]),
  events: defineTable({
    eventType: v.string(),
    timestamp: v.number(),
    workspaceId: v.id("workspaces"),
    metadata: v.record(v.string(), v.any()),
  }).index("by_workspace", ["workspaceId"]),
  flags: defineTable({
    description: v.string(),
    timestamp: v.number(),
    type: v.string(),
    submissionId: v.id("submissions"),
    flaggedBy: v.string(), // teacher user id
  }).index("by_submission", ["submissionId"]),
  submissions: defineTable({
    assignmentId: v.id("assignments"),
    studentId: v.string(), // map this to betterAuth user id
    workspaceId: v.optional(v.id("workspaces")),
    submitted: v.boolean(),
    submittedAt: v.optional(v.number()),
    grade: v.optional(v.float64()),
    feedback: v.optional(v.string()),
    gradedAt: v.optional(v.number()),
    gradedBy: v.optional(v.string()), // teacher user id
    createdAt: v.number(),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_student", ["studentId"])
    .index("by_assignment_student", ["assignmentId", "studentId"]),
  workspaces: defineTable({
    coderWorkspaceId: v.string(),
    userId: v.string(), // map this to betterAuth user id
    assignmentId: v.optional(v.id("assignments")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
  userProfiles: defineTable({
    userId: v.string(), // map this to betterAuth user id
    role: v.union(v.literal("student"), v.literal("teacher")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
  notifications: defineTable({
    userId: v.string(), // recipient user id
    type: v.union(
      v.literal("enrollment_request"),
      v.literal("enrollment_approved"),
      v.literal("assignment_graded"),
      v.literal("assignment_due_soon"),
      v.literal("assignment_created"),
    ),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    metadata: v.optional(v.record(v.string(), v.any())),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"]),
});
