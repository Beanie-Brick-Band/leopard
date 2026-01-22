"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  FileText,
  Plus,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
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

function Content({ classroomId }: { classroomId: Id<"classrooms"> }) {
  const classroomDetails = useQuery(api.web.teacher.getClassroomDetails, {
    classroomId,
  });
  const pendingEnrollments = useQuery(api.web.teacher.getPendingEnrollments, {
    classroomId,
  });
  const enrolledStudents = useQuery(api.web.teacher.getEnrolledStudents, {
    classroomId,
  });
  const updateEnrollmentStatus = useMutation(
    api.web.teacher.updateEnrollmentStatus,
  );
  const removeStudent = useMutation(api.web.teacher.removeStudent);
  const deleteClassroom = useMutation(api.web.teacher.deleteClassroom);

  const [isDeleting, setIsDeleting] = useState(false);

  if (!classroomDetails) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const handleApproveEnrollment = async (
    relationId: Id<"classroomStudentsRelations">,
  ) => {
    try {
      await updateEnrollmentStatus({
        relationId,
        status: "approved",
      });
      toast.success("Enrollment approved!");
    } catch (error) {
      toast.error("Failed to approve enrollment");
      console.error(error);
    }
  };

  const handleRejectEnrollment = async (
    relationId: Id<"classroomStudentsRelations">,
  ) => {
    try {
      await updateEnrollmentStatus({
        relationId,
        status: "rejected",
      });
      toast.success("Enrollment rejected");
    } catch (error) {
      toast.error("Failed to reject enrollment");
      console.error(error);
    }
  };

  const handleRemoveStudent = async (
    relationId: Id<"classroomStudentsRelations">,
  ) => {
    if (
      !confirm(
        "Are you sure you want to remove this student from the classroom?",
      )
    ) {
      return;
    }

    try {
      await removeStudent({ relationId });
      toast.success("Student removed from classroom");
    } catch (error) {
      toast.error("Failed to remove student");
      console.error(error);
    }
  };

  const handleDeleteClassroom = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this classroom? This will delete all assignments and submissions. This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteClassroom({ classroomId });
      toast.success("Classroom deleted successfully");
      window.location.href = "/teacher";
    } catch (error) {
      toast.error("Failed to delete classroom");
      console.error(error);
      setIsDeleting(false);
    }
  };

  const {
    classroom,
    assignments,
    studentCount,
    pendingEnrollments: pendingCount,
  } = classroomDetails;

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <Link
          href="/teacher"
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Classrooms
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{classroom.className}</h1>
            <p className="text-muted-foreground mt-1">
              {classroom.description}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/teacher/classroom/${classroomId}/assignment/new`}>
                <Plus className="mr-2 h-4 w-4" />
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Enrolled Students
            </CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Requests
            </CardTitle>
            <UserCheck className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Enrollment Requests */}
      {pendingEnrollments && pendingEnrollments.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">
            Pending Enrollment Requests
          </h2>
          <div className="space-y-2">
            {pendingEnrollments.map((enrollment) => (
              <Card key={enrollment._id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">
                      Student ID: {enrollment.studentId}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Requested:{" "}
                      {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApproveEnrollment(enrollment._id)}
                    >
                      <UserCheck className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectEnrollment(enrollment._id)}
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Enrolled Students */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Enrolled Students</h2>
        {enrolledStudents && enrolledStudents.length > 0 ? (
          <div className="space-y-2">
            {enrolledStudents.map((enrollment) => (
              <Card key={enrollment._id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">
                      Student ID: {enrollment.studentId}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Enrolled:{" "}
                      {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveStudent(enrollment._id)}
                  >
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No students enrolled yet.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Assignments */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Assignments</h2>
        {assignments && assignments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment) => (
              <Link
                key={assignment._id}
                href={`/teacher/classroom/${classroomId}/assignment/${assignment._id}`}
              >
                <Card className="hover:border-primary h-full transition-all hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="line-clamp-1">
                      {assignment.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: assignment.description,
                        }}
                      />
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                No assignments yet. Create your first assignment!
              </p>
              <Button asChild>
                <Link href={`/teacher/classroom/${classroomId}/assignment/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Assignment
                </Link>
              </Button>
            </CardContent>
          </Card>
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
        <div className="flex min-h-screen items-center justify-center">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please sign in to view this classroom.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/auth/sign-in">
                <Button>Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
      <Authenticated>
        <Content classroomId={classroomId} />
      </Authenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Spinner />
        </div>
      </AuthLoading>
    </main>
  );
}
