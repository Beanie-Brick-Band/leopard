"use client";

import { startTransition, use, useActionState, useEffect } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
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

import { launchWorkspace } from "~/app/app/actions";
import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";

function Content({
  classroomId,
  assignmentId,
}: {
  classroomId: Id<"classrooms">;
  assignmentId: Id<"assignments">;
}) {
  const assignment = useQuery(api.web.assignment.getById, { id: assignmentId });
  const submission = useQuery(
    api.web.submissions.getMySubmissionForAssignment,
    { assignmentId },
  );
  const submitAssignment = useMutation(api.web.submissions.submitAssignment);

  const [state, action, pending] = useActionState(
    () => launchWorkspace(assignmentId),
    null,
  );

  useEffect(() => {
    if (state) {
      window.location.assign(state);
    }
  }, [state]);

  const handleSubmit = async () => {
    try {
      await submitAssignment({ assignmentId });
      toast.success("Assignment submitted successfully!");
    } catch (error) {
      toast.error("Failed to submit assignment");
      console.error(error);
    }
  };

  if (!assignment) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Assignment not found.</p>
            <Link href={`/student/classroom/${classroomId}`} className="mt-4">
              <Button variant="outline">Back to Classroom</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSubmitted = submission?.submitted ?? false;
  const isGraded = submission?.grade !== undefined;
  const dueDate = new Date(assignment.dueDate);
  const isOverdue = dueDate < new Date() && !isSubmitted;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link
          href={`/student/classroom/${classroomId}`}
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Classroom
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left Column - Main Content */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="mb-2 text-3xl font-bold">{assignment.name}</h1>
            <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Due: {dueDate.toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {dueDate.toLocaleTimeString()}
              </span>
              {isSubmitted && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Submitted
                </span>
              )}
              {isOverdue && (
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  Overdue
                </span>
              )}
            </div>
          </div>

          <Separator />

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: assignment.description }}
              />
            </CardContent>
          </Card>

          {/* Grade Card (if graded) */}
          {isGraded && (
            <Card className="border-green-500/50">
              <CardHeader>
                <CardTitle>Your Grade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Score:</span>
                  <span className="text-4xl font-bold text-green-600 dark:text-green-400">
                    {submission.grade}
                  </span>
                </div>
                {submission.feedback && (
                  <div>
                    <span className="font-semibold">Feedback:</span>
                    <p className="text-muted-foreground mt-2 whitespace-pre-wrap">
                      {submission.feedback}
                    </p>
                  </div>
                )}
                {submission.gradedAt && (
                  <p className="text-muted-foreground text-sm">
                    Graded on: {new Date(submission.gradedAt).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pending Grading Notice */}
          {submission?.submitted && !isGraded && (
            <Card className="border-blue-500/50 bg-blue-500/5">
              <CardContent className="py-6">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Your assignment has been submitted and is pending grading.
                </p>
                {submission.submittedAt && (
                  <p className="mt-1 text-sm text-blue-900/70 dark:text-blue-100/70">
                    Submitted on:{" "}
                    {new Date(submission.submittedAt).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Overdue Warning */}
          {isOverdue && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="py-6">
                <p className="text-sm text-red-900 dark:text-red-100">
                  This assignment is overdue. Please submit as soon as possible.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Actions & Status */}
        <div className="space-y-4">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assignment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Status</span>
                  {isGraded ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Graded
                    </span>
                  ) : isSubmitted ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Submitted
                    </span>
                  ) : isOverdue ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400">
                      <AlertCircle className="h-3 w-3" />
                      Overdue
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400">
                      <XCircle className="h-3 w-3" />
                      Not Submitted
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Due Date
                  </span>
                  <span className="text-sm font-medium">
                    {dueDate.toLocaleDateString()}
                  </span>
                </div>
                {assignment.templateId && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      Template
                    </span>
                    <span className="font-mono text-xs">
                      {assignment.templateId}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Button
                  onClick={() => {
                    startTransition(action);
                  }}
                  disabled={pending}
                  className="w-full"
                  size="lg"
                >
                  {pending ? <Spinner /> : "Launch Workspace"}
                </Button>
                {!isSubmitted && !isGraded && (
                  <Button
                    onClick={handleSubmit}
                    variant="default"
                    className="w-full"
                    size="lg"
                  >
                    Submit Assignment
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Grade Summary (if graded) */}
          {isGraded && (
            <Card className="border-green-500/50">
              <CardHeader>
                <CardTitle className="text-base">Your Grade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                    <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {submission.grade}
                    </span>
                  </div>
                </div>
                {submission.gradedAt && (
                  <p className="text-muted-foreground mt-3 text-center text-xs">
                    Graded {new Date(submission.gradedAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Submission Info */}
          {submission?.submitted && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Submission Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground block">
                    Submitted At
                  </span>
                  <span className="font-medium">
                    {new Date(submission.submittedAt!).toLocaleString()}
                  </span>
                </div>
                {submission.workspaceId && (
                  <div className="text-sm">
                    <span className="text-muted-foreground block">
                      Workspace
                    </span>
                    <span className="font-mono text-xs">
                      {submission.workspaceId}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentAssignmentPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>;
}) {
  const { id, assignmentId: assignmentIdParam } = use(params);
  const classroomId = id as Id<"classrooms">;
  const assignmentId = assignmentIdParam as Id<"assignments">;

  return (
    <main>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please sign in to view this assignment.
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
        <Content classroomId={classroomId} assignmentId={assignmentId} />
      </Authenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AuthLoading>
    </main>
  );
}
