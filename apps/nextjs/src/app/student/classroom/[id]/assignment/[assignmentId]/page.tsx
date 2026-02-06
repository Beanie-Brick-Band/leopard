"use client";

import {
  startTransition,
  use,
  useActionState,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Calendar, CheckCircle2, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  const activeWorkspace = useQuery(api.web.assignment.getMyActiveWorkspace);
  const submissionResult = useQuery(
    api.web.submission.getOwnSubmissionsForAssignment,
    {
      assignmentId,
    },
  );
  const submitAssignment = useMutation(api.web.submission.submitAssignment);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);

  const [workspaceUrl, launchAction, isLaunching] = useActionState(
    () => launchWorkspace(assignmentId),
    null as string | null,
  );

  useEffect(() => {
    if (workspaceUrl) {
      window.location.assign(workspaceUrl);
    }
  }, [workspaceUrl]);

  if (assignment === undefined || submissionResult === undefined) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const hasSubmission = submissionResult.success === true;
  const submission = hasSubmission ? submissionResult.submission : null;
  const grade =
    submission && "grade" in submission ? submission.grade : undefined;
  const feedback =
    submission && "submissionFeedback" in submission
      ? submission.submissionFeedback
      : undefined;
  const gradedAt =
    submission && "gradedAt" in submission ? submission.gradedAt : undefined;
  const submittedAt = submission?.submittedAt;
  const isPastDue = Date.now() > assignment.dueDate;

  const handleSubmit = async () => {
    if (!activeWorkspace) {
      toast.error("Launch your workspace first before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitAssignment({
        assignmentId,
        workspaceId: activeWorkspace._id,
      });
      toast.success(
        hasSubmission ? "Assignment re-submitted." : "Assignment submitted.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit assignment",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSubmitConfirm = () => {
    setIsSubmitConfirmOpen(true);
  };

  const closeSubmitConfirm = () => {
    setIsSubmitConfirmOpen(false);
  };

  const confirmSubmit = async () => {
    setIsSubmitConfirmOpen(false);
    await handleSubmit();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-4">
        <Link
          href={`/student/classroom/${classroomId}`}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          <span className="inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Classroom
          </span>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div>
            <h1 className="mb-2 text-3xl font-bold">{assignment.name}</h1>
            <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Due: {new Date(assignment.dueDate).toLocaleDateString()}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {new Date(assignment.dueDate).toLocaleTimeString()}
              </span>
              {hasSubmission ? (
                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Submitted
                </span>
              ) : null}
            </div>
          </div>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {assignment.description ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {assignment.description}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No description yet.
                </p>
              )}
            </CardContent>
          </Card>

          {grade !== undefined ? (
            <Card className="border-green-500/50">
              <CardHeader>
                <CardTitle>Your Grade</CardTitle>
                <CardDescription>
                  {gradedAt
                    ? `Graded on ${new Date(gradedAt).toLocaleString()}`
                    : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                  {grade}
                </p>
                {feedback ? (
                  <div>
                    <p className="text-sm font-medium">Feedback</p>
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                      {feedback}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : hasSubmission ? (
            <Card>
              <CardContent className="text-muted-foreground py-6 text-sm">
                Submitted{" "}
                {submittedAt
                  ? `on ${new Date(submittedAt).toLocaleString()}.`
                  : "successfully."}{" "}
                Grading is pending.
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assignment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">
                  {grade !== undefined
                    ? "Graded"
                    : hasSubmission
                      ? "Submitted"
                      : "Not submitted"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Due Date</span>
                <span className="font-medium">
                  {new Date(assignment.dueDate).toLocaleDateString()}
                </span>
              </div>
              <Separator />
              {!hasSubmission ? (
                <>
                  <Button
                    className="w-full"
                    onClick={openSubmitConfirm}
                    disabled={
                      isSubmitting ||
                      isPastDue ||
                      activeWorkspace === undefined ||
                      activeWorkspace === null
                    }
                  >
                    {isSubmitting ? "Submitting..." : "Submit Assignment"}
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => {
                      startTransition(launchAction);
                    }}
                    disabled={isLaunching}
                  >
                    {isLaunching ? "Launching..." : "Launch Workspace"}
                  </Button>
                  {activeWorkspace === undefined ? (
                    <p className="text-muted-foreground text-xs">
                      Checking active workspace...
                    </p>
                  ) : activeWorkspace === null ? (
                    <p className="text-muted-foreground text-xs">
                      Launch a workspace before submitting.
                    </p>
                  ) : isPastDue ? (
                    <p className="text-muted-foreground text-xs">
                      This assignment is past due.
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Submission uses your currently active workspace.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Assignment submitted and awaiting grading.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {isSubmitConfirmOpen && !hasSubmission ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Submit Assignment?</CardTitle>
              <CardDescription>
                This action is irreversible. You will not be able to submit
                again or relaunch this workspace after submission.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={closeSubmitConfirm}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Confirm Submit"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default function StudentAssignmentPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string }>;
}) {
  const { id, assignmentId } = use(params);

  return (
    <main>
      <Unauthenticated>
        <div className="container mx-auto max-w-xl p-6">
          <Card>
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                Sign in to view this assignment.
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
        <Content
          classroomId={id as Id<"classrooms">}
          assignmentId={assignmentId as Id<"assignments">}
        />
      </Authenticated>
      <AuthLoading>
        <div className="flex min-h-[300px] items-center justify-center">
          <Spinner />
        </div>
      </AuthLoading>
    </main>
  );
}
