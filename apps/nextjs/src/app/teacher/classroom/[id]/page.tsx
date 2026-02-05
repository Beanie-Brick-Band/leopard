"use client";

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

  const { classroom, assignments, studentCount, pendingEnrollments, enrolledStudents } =
    classroomDetails;

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
        <Link href="/teacher" className="text-sm text-muted-foreground underline">
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

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Assignments</CardDescription>
            <CardTitle>{assignments.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Enrolled Students</CardDescription>
            <CardTitle>{studentCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pending Enrollments</CardDescription>
            <CardTitle>{pendingEnrollments.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Assignments</h2>
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No assignments yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {assignments.map((assignment) => (
              <Link
                key={assignment._id}
                href={`/teacher/classroom/${classroomId}/assignment/${assignment._id}`}
              >
                <Card className="h-full transition-colors hover:border-primary">
                  <CardHeader>
                    <CardTitle>{assignment.name}</CardTitle>
                    <CardDescription>
                      Due {new Date(assignment.dueDate).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Enrolled Students</h2>
        {enrolledStudents.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No students are enrolled.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {enrolledStudents.map((enrollment) => (
              <Card key={enrollment._id}>
                <CardContent className="flex items-center justify-between gap-2 py-4">
                  <div>
                    <p className="font-medium">{enrollment.studentId}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {new Date(enrollment._creationTime).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleRemoveStudent(enrollment.studentId)}
                  >
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
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
              <CardDescription>
                Sign in to view this classroom.
              </CardDescription>
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
