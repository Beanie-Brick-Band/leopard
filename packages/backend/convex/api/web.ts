import {mutation, query} from "../_generated/server"
import { v } from "convex/values";
import { Doc } from "../_generated/dataModel";
import { WithoutSystemFields } from "convex/server";

export const addStudentToClassroom = mutation({
  args: {
    classroomId: v.id("classrooms"),
    studentId: v.id("users")
  },
  handler: async (ctx, args) => {

    const student = await ctx.db.get(args.studentId);
    if (!student) throw new Error("Student not found");
    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) throw new Error("Classroom not found");

    if (student.classrooms.includes(args.classroomId)){
      throw new Error("Student already in classroom");
    }

    await ctx.db.patch(args.studentId, {
        classrooms: [...student.classrooms, args.classroomId]
    });
  },
});

export const addClassroom = mutation({
  args: {
    professorId: v.id("users"),
    className: v.string()
  },
  handler: async (ctx, args) => {

    const professor = await ctx.db.get(args.professorId);
    if (!professor) throw new Error("Professor not found");

    const newClassroom : WithoutSystemFields<Doc<"classrooms">> = {
        ownerId: args.professorId,
        assignments: [],
        className: args.className,
        metadata: "{}"
    }

    const classroomId = await ctx.db.insert("classrooms", newClassroom)

    return classroomId
  },
});

export const getClassroomsByProfessor = query({
  args: { professorId: v.id("users") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("classrooms")
      .filter((q) => q.eq(q.field("ownerId"), args.professorId))
      .order("desc")
      .collect();
    return tasks;
  },
});

export const getStudentInfo = query({
  args: { studentId: v.id("users") },
  handler: async (ctx, args) => {
    const student = await ctx.db.get(args.studentId);
    if (!student) throw new Error("Student not found");
    return student;
  },
});

export const getClassroomInfo = query({
  args: { classroomId: v.id("classrooms") },
  handler: async (ctx, args) => {
    const classroom = await ctx.db.get(args.classroomId);
    if (!classroom) throw new Error("Classroom not found");
    return classroom;
  },
});


