"use client";

import { startTransition, use, useActionState, useState } from "react";
import Link from "next/link";
import { useAction, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
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

import { launchWorkspace, submitWorkspace } from "~/app/app/actions";
import { WorkspaceLaunchingOverlay } from "~/components/workspace-launching-overlay";
import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";

function Content({
  classroomId,
  assignmentId,
}: {
  classroomId: Id<"classrooms">;
  assignmentId: Id<"assignments">;
}) {
  const assignment = useQuery(api.web.assignment.getById, { id: assignmentId });
  const assignmentWorkspace = useQuery(
    api.web.assignment.getMyWorkspaceForAssignment,
    {
      assignmentId,
    },
  );
  const lastEditedTimestamp = useQuery(
    api.web.assignment.getLastEditedTimestamp,
    {
      assignmentId,
    },
  );
  const submissionResult = useQuery(
    api.web.submission.getOwnSubmissionsForAssignment,
    {
      assignmentId,
    },
  );
  const submitAssignment = useAction(
    api.web.submissionActions.triggerSubmission,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [workspaceUrl, launchAction, isLaunching] = useActionState(
    (_: unknown, id: Id<"assignments"> | null) => {
      if (!id) {
        return null;
      }
      return launchWorkspace(id);
    },
    null as string | null,
  );

  const handleLaunchWorkspace = () => {
    startTransition(() => {
      launchAction(assignmentId);
    });
  };

  if (submissionResult === undefined || assignment === undefined) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const submissionRecord =
    submissionResult.success === true ? submissionResult.submission : null;
  const status =
    submissionRecord && "status" in submissionRecord
      ? submissionRecord.status
      : null;

  const isConfirmed = status === "confirmed";
  const isUploading = status === "uploading" || isSubmitting;
  const isFailed = status === "failed";
  // "Submitted" = confirmed, or legacy records without status field
  const hasSubmission = submissionRecord !== null && (isConfirmed || !status);

  const grade =
    submissionRecord && "grade" in submissionRecord
      ? submissionRecord.grade
      : undefined;
  const feedback =
    submissionRecord && "submissionFeedback" in submissionRecord
      ? submissionRecord.submissionFeedback
      : undefined;
  const gradedAt =
    submissionRecord && "gradedAt" in submissionRecord
      ? submissionRecord.gradedAt
      : undefined;
  const submittedAt = submissionRecord?.submittedAt;
  const isPastDue = Date.now() > assignment.dueDate;
  const hasWorkspaceForAssignment =
    assignmentWorkspace !== undefined && assignmentWorkspace !== null;

  const handleSubmit = async () => {
    if (!assignmentWorkspace) {
      toast.error("Launch your workspace first before submitting.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitWorkspace(assignmentId);
      toast.success("Assignment submitted successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit assignment";
      setSubmitError(message);
      toast.error(message);
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
      <WorkspaceLaunchingOverlay
        isLaunching={isLaunching}
        workspaceUrl={workspaceUrl}
        onClose={() => {
          startTransition(() => {
            launchAction(null);
          });
        }}
      />
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
              {submissionResult.success &&
              !submissionResult.submission?.gradesReleased ? (
                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Submitted
                </span>
              ) : submissionResult.success &&
                submissionResult.submission?.gradesReleased ? (
                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Graded
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
                  <Editor
                    content={assignment.description}
                    onChange={() => undefined}
                    editable={false}
                  />
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
                  {grade}%
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
                    : isConfirmed
                      ? "Submitted"
                      : isUploading
                        ? "Submitting..."
                        : isFailed
                          ? "Failed"
                          : hasSubmission
                            ? "Submitted"
                            : "Not submitted"}
                </span>
              </div>
              {submittedAt ? (
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Submitted At</span>
                  <span className="text-right font-medium">
                    {new Date(submittedAt).toLocaleString()}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Last Edited</span>
                <span className="text-right font-medium">
                  {lastEditedTimestamp
                    ? new Date(lastEditedTimestamp).toLocaleString()
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Due Date</span>
                <span className="text-right font-medium">
                  {new Date(assignment.dueDate).toLocaleString()}
                </span>
              </div>
              <Separator />

              {isFailed && submitError ? (
                <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              ) : null}

              {isConfirmed ? (
                <p className="text-muted-foreground text-xs">
                  Assignment submitted successfully. Your workspace has been
                  shut down.
                </p>
              ) : (
                <>
                  <Button
                    className="w-full"
                    onClick={openSubmitConfirm}
                    disabled={
                      isUploading ||
                      isPastDue ||
                      assignmentWorkspace === undefined ||
                      assignmentWorkspace === null
                    }
                  >
                    {isUploading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </span>
                    ) : isFailed ? (
                      "Retry Submission"
                    ) : (
                      "Submit Assignment"
                    )}
                  </Button>
                  <Button
                    className="w-full"
                    onClick={handleLaunchWorkspace}
                    disabled={isLaunching}
                  >
                    {isLaunching ? "Launching..." : "Launch Workspace"}
                  </Button>
                  {assignmentWorkspace === undefined ? (
                    <p className="text-muted-foreground text-xs">
                      Checking assignment workspace...
                    </p>
                  ) : assignmentWorkspace === null ? (
                    <p className="text-muted-foreground text-xs">
                      Launch a workspace before submitting.
                    </p>
                  ) : isPastDue ? (
                    <p className="text-muted-foreground text-xs">
                      This assignment is past due.
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Submitting will zip your workspace, upload it, and shut
                      down the workspace.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {isSubmitConfirmOpen && !isConfirmed ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
            <CardHeader>
              <CardTitle>Submit Assignment?</CardTitle>
              <CardDescription>
                This action is irreversible. You will not be able to submit
                again or relaunch this workspace after submission.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {hasWorkspaceForAssignment && (
                <Card className="border">
                  <CardHeader>
                    <CardTitle className="text-base">Current Work</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TextReplayScrubberComponent
                      workspaceId={assignmentWorkspace._id}
                      frozenReplay={true}
                    />
                  </CardContent>
                </Card>
              )}
              <div className="flex justify-end gap-2">
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
              </div>
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
