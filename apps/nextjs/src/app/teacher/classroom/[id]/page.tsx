"use client";

import type { ColDef } from "ag-grid-community";
import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import type { Id } from "@package/backend/convex/_generated/dataModel";
import { api } from "@package/backend/convex/_generated/api";
import { Button } from "@package/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@package/ui/card";
import { Separator } from "@package/ui/separator";
import { Spinner } from "@package/ui/spinner";

import { AppDataGrid } from "~/components/app-data-grid";
import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";

function ClassroomContent({ classroomId }: { classroomId: Id<"classrooms"> }) {
  const classroomDetails = useQuery(api.web.teacher.getClassroomDetails, {
    classroomId,
  });
  const removeStudent = useMutation(api.web.teacher.removeStudent);
  const deleteClassroom = useMutation(api.web.teacher.deleteClassroom);
  const [isDeleting, setIsDeleting] = useState(false);

  if (classroomDetails === undefined) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const { classroom, assignments, enrolledStudents } = classroomDetails;

  const handleRemoveStudent = async (studentId: string) => {
    try {
      await removeStudent({
        classroomId,
        studentId,
      });
      toast.success("Student removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove student",
      );
    }
  };

  const assignmentRows = assignments.map((assignment) => ({
    assignmentName: assignment.name,
    dueDateIso: new Date(assignment.dueDate).toISOString(),
    href: `/teacher/classroom/${classroomId}/assignment/${assignment._id}`,
  }));
  const assignmentColumnDefs: ColDef<(typeof assignmentRows)[number]>[] = [
    {
      field: "assignmentName",
      headerName: "Assignment",
      minWidth: 240,
    },
    {
      field: "dueDateIso",
      headerName: "Due",
      minWidth: 220,
      valueFormatter: ({ value }) =>
        typeof value === "string" ? new Date(value).toLocaleString() : "",
    },
    {
      colId: "actions",
      headerName: "Actions",
      filter: false,
      flex: 0,
      maxWidth: 140,
      minWidth: 120,
      resizable: false,
      sortable: false,
      cellRenderer: ({ data }: { data?: (typeof assignmentRows)[number] }) =>
        data ? (
          <div className="flex h-full items-center justify-end">
            <Button asChild size="sm" variant="outline">
              <Link href={data.href}>Open</Link>
            </Button>
          </div>
        ) : null,
    },
  ];

  const enrolledStudentRows = enrolledStudents.map((enrollment) => {
    const studentName =
      enrollment.studentName ??
      enrollment.studentEmail?.split("@")[0] ??
      "Unnamed student";

    return {
      joinedIso: new Date(enrollment._creationTime).toISOString(),
      studentEmail: enrollment.studentEmail ?? "No email available",
      studentId: enrollment.studentId,
      studentLabel: `${studentName} ${enrollment.studentEmail ?? ""} ${enrollment.studentId}`,
      studentName,
    };
  });
  const enrolledStudentColumnDefs: ColDef<
    (typeof enrolledStudentRows)[number]
  >[] = [
    {
      field: "studentLabel",
      headerName: "Student",
      minWidth: 260,
      cellRenderer: ({
        data,
      }: {
        data?: (typeof enrolledStudentRows)[number];
      }) =>
        data ? (
          <div className="py-2">
            <p className="font-medium">{data.studentName}</p>
            <p className="text-muted-foreground font-mono text-xs">
              {data.studentId}
            </p>
          </div>
        ) : null,
    },
    {
      field: "studentEmail",
      headerName: "Email",
      minWidth: 240,
    },
    {
      field: "joinedIso",
      headerName: "Joined",
      minWidth: 220,
      valueFormatter: ({ value }) =>
        typeof value === "string" ? new Date(value).toLocaleString() : "",
    },
    {
      colId: "actions",
      headerName: "Actions",
      filter: false,
      flex: 0,
      maxWidth: 150,
      minWidth: 130,
      resizable: false,
      sortable: false,
      cellRenderer: ({
        data,
      }: {
        data?: (typeof enrolledStudentRows)[number];
      }) =>
        data ? (
          <div className="flex h-full items-center justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRemoveStudent(data.studentId)}
            >
              Remove
            </Button>
          </div>
        ) : null,
    },
  ];

  const handleDeleteClassroom = async () => {
    if (!confirm("Delete classroom and all related assignments/submissions?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteClassroom({ classroomId });
      toast.success("Classroom deleted");
      window.location.assign("/teacher");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete classroom",
      );
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div className="space-y-2">
        <Link
          href="/teacher"
          className="text-muted-foreground text-sm underline"
        >
          Back to Teacher Dashboard
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{classroom.className}</h1>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/teacher/classroom/${classroomId}/assignment/new`}>
                New Assignment
              </Link>
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClassroom}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Classroom"}
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Assignments</h2>
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-6 text-sm">
              No assignments yet.
            </CardContent>
          </Card>
        ) : (
          <AppDataGrid
            columnDefs={assignmentColumnDefs}
            rowData={assignmentRows}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Enrolled Students</h2>
        {enrolledStudents.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-6 text-sm">
              No students are enrolled.
            </CardContent>
          </Card>
        ) : (
          <AppDataGrid
            columnDefs={enrolledStudentColumnDefs}
            rowData={enrolledStudentRows}
            rowHeight={72}
          />
        )}
      </section>
    </div>
  );
}

export default function TeacherClassroomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const classroomId = id as Id<"classrooms">;

  return (
    <main>
      <Unauthenticated>
        <div className="container mx-auto max-w-xl p-6">
          <Card>
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>Sign in to view this classroom.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/auth/sign-in">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
      <Authenticated>
        <ClassroomContent classroomId={classroomId} />
      </Authenticated>
      <AuthLoading>
        <div className="flex min-h-[300px] items-center justify-center">
          <Spinner />
        </div>
      </AuthLoading>
    </main>
  );
}
