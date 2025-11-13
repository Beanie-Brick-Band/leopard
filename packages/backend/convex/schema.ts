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
    ownerId: v.id("users"),
  }),
  events: defineTable({
    changeDetails: v.object({}),
    eventType: v.string(),
    timestamp: v.number(),
    workspaceId: v.id("workspaces"),
    metadata: v.object({}),
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
    studentId: v.id("users"),
    submitted: v.boolean(),
    workspaceId: v.id("workspaces"),
  }),
  users: defineTable({
    classrooms: v.array(v.id("classrooms")),
    email: v.string(),
    name: v.string(),
    userType: v.string(),
  }),
  workspaces: defineTable({ 
    coderWorkspaceId: v.string(),
    coderSessionId: v.string(),
    coderSessionGeneratedTime: v.string(),
    watchedFlag: v.boolean(),
   }),
});