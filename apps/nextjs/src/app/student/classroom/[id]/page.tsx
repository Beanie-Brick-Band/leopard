"use client";

import { startTransition, use, useActionState, useEffect } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft } from "lucide-react";
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

import { launchWorkspace } from "~/app/app/actions";
import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";

function AssignmentCard({
  assignment,
  classroomId,
}: {
  assignment: {
    _id: Id<"assignments">;
    name: string;
    description: string;
    dueDate: string;
    createdAt: number;
  };
  classroomId: Id<"classrooms">;
}) {
  const submission = useQuery(
    api.web.submissions.getMySubmissionForAssignment,
    { assignmentId: assignment._id },
  );
  const submitAssignment = useMutation(api.web.submissions.submitAssignment);

  const [state, action, pending] = useActionState(
    () => launchWorkspace(assignment._id),
    null,
  );

  useEffect(() => {
    if (state) {
      window.location.assign(state);
    }
  }, [state]);

  const handleSubmit = async () => {
    try {
      await submitAssignment({ assignmentId: assignment._id });
      toast.success("Assignment submitted successfully!");
    } catch (error) {
      toast.error("Failed to submit assignment");
      console.error(error);
    }
  };

  const isSubmitted = submission?.submitted ?? false;
  const isGraded = submission?.grade !== undefined;
  const dueDate = new Date(assignment.dueDate);
  const isOverdue = dueDate < new Date() && !isSubmitted;

  return (
    <Card className={isOverdue ? "border-destructive" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {assignment.name}
              {isSubmitted && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  Submitted
                </span>
              )}
              {isOverdue && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                  Overdue
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Due: {dueDate.toLocaleDateString()} at{" "}
              {dueDate.toLocaleTimeString()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="prose prose-sm dark:prose-invert line-clamp-3 max-w-none text-sm"
          dangerouslySetInnerHTML={{ __html: assignment.description }}
        />

        {isGraded && (
          <div className="bg-muted rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Grade:</span>
              <span className="text-lg font-bold">{submission.grade}</span>
            </div>
            {submission.feedback && (
              <div className="mt-2">
                <span className="text-sm font-semibold">Feedback:</span>
                <p className="text-muted-foreground mt-1 text-sm">
                  {submission.feedback}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => {
              startTransition(action);
            }}
            variant="outline"
            size="sm"
            disabled={pending}
          >
            {pending ? <Spinner /> : "Launch Workspace"}
          </Button>
          {!isSubmitted && !isGraded && (
            <Button onClick={handleSubmit} size="sm">
              Submit Assignment
            </Button>
          )}
          <Link
            href={`/student/classroom/${classroomId}/assignment/${assignment._id}`}
          >
            <Button variant="ghost" size="sm">
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Content({ classroomId }: { classroomId: Id<"classrooms"> }) {
  const enrollments = useQuery(api.web.classroom.getEnrolled);
  const allClassrooms = useQuery(api.web.classroom.getAvailableToEnroll);
  const assignments = useQuery(
    api.web.teacherAssignments.getAssignmentsByClassroom,
    { classroomId },
  );
  const enroll = useMutation(api.web.classroom.enroll);

  const isEnrolled = enrollments?.some((c) => c?._id === classroomId) ?? false;
  const classroom =
    enrollments?.find((c) => c?._id === classroomId) ??
    allClassrooms?.find((c) => c._id === classroomId);

  const handleEnroll = async () => {
    try {
      await enroll({ classroomId });
      toast.success(
        classroom?.enrollmentRequiresApproval
          ? "Enrollment request sent!"
          : "Successfully enrolled!",
      );
    } catch (error) {
      toast.error("Failed to enroll in classroom");
      console.error(error);
    }
  };

  if (!classroom) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Classroom not found.</p>
            <Link href="/student" className="mt-4">
              <Button variant="outline">Back to Classes</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Link
            href="/student"
            className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Classes
          </Link>
          <h1 className="text-3xl font-bold">{classroom.className}</h1>
          <p className="text-muted-foreground mt-1">{classroom.description}</p>
        </div>
        {!isEnrolled && (
          <Button onClick={handleEnroll}>
            {classroom.enrollmentRequiresApproval
              ? "Request to Enroll"
              : "Enroll Now"}
          </Button>
        )}
      </div>

      <Separator />

      {!isEnrolled && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-6">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              You are not enrolled in this class. Click the "
              {classroom.enrollmentRequiresApproval
                ? "Request to Enroll"
                : "Enroll Now"}
              " button above to join.
            </p>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Assignments</h2>
        {assignments && assignments.length > 0 ? (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <AssignmentCard
                key={assignment._id}
                assignment={assignment}
                classroomId={classroomId}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                No assignments yet for this class.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

export default function StudentClassroomPage({
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
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AuthLoading>
    </main>
  );
}
