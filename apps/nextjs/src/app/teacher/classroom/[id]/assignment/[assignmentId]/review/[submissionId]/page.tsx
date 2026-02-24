"use client";

import { use, useEffect, useState } from "react";
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
import { Input } from "@package/ui/input";
import { Label } from "@package/ui/label";
import { Separator } from "@package/ui/separator";
import { Spinner } from "@package/ui/spinner";

import { TextReplayScrubberComponent } from "~/components/scrubber";
import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";

function ReviewContent({
  classroomId,
  assignmentId,
  submissionId,
}: {
  classroomId: Id<"classrooms">;
  assignmentId: Id<"assignments">;
  submissionId: Id<"submissions">;
}) {
  const assignment = useQuery(api.web.assignment.getById, { id: assignmentId });
  const submission = useQuery(api.web.teacherAssignments.getSubmissionById, {
    submissionId,
  });
  const gradeSubmission = useMutation(
    api.web.teacherAssignments.gradeSubmission,
  );
  const provideSubmissionFeedback = useMutation(
    api.web.teacherAssignments.provideSubmissionFeedback,
  );
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const studentDisplayName =
    submission?.studentName ??
    submission?.studentEmail?.split("@")[0] ??
    submission?.studentId;

  useEffect(() => {
    if (!submission) {
      return;
    }

    setGrade(submission.grade?.toString() ?? "");
    setFeedback(submission.submissionFeedback ?? "");
  }, [submission]);

  if (assignment === undefined || submission === undefined) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const handleSave = async () => {
    const nextGrade =
      grade.trim() === ""
        ? null
        : Number.isNaN(Number(grade))
          ? Number.NaN
          : Number(grade);

    if (Number.isNaN(nextGrade)) {
      toast.error("Grade must be a valid number");
      return;
    }

    setIsSaving(true);
    try {
      const promises = [];
      if (nextGrade !== null) {
        promises.push(
          gradeSubmission({
            submissionId: submission._id,
            grade: nextGrade,
          }),
        );
      }

      promises.push(
        provideSubmissionFeedback({
          submissionId: submission._id,
          feedback,
        }),
      );

      await Promise.allSettled(promises);

      toast.success("Review saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save review",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-4">
        <Link
          href={`/teacher/classroom/${classroomId}/assignment/${assignmentId}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assignment
        </Link>
      </div>

      <div className="mb-6 space-y-1">
        <h1 className="text-3xl font-bold">Review Submission</h1>
        <p className="text-muted-foreground text-sm">
          {assignment.name} • {studentDisplayName}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Student</span>
                <span className="font-medium">{studentDisplayName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Current Grade</span>
                <span className="font-medium">
                  {submission.grade ?? "Not graded"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Workspace</span>
                <span className="font-mono text-xs">
                  {submission.workspaceId ?? "Not linked"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Replay</CardTitle>
              <CardDescription>
                Scrub through the workspace edit history for this submission.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submission.workspaceId ? (
                <TextReplayScrubberComponent
                  workspaceId={submission.workspaceId}
                />
              ) : (
                <p className="text-muted-foreground text-sm">
                  No workspace is attached to this submission, so replay is
                  unavailable.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grading</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="review-grade">Grade</Label>
                <Input
                  id="review-grade"
                  value={grade}
                  onChange={(event) => setGrade(event.target.value)}
                  placeholder="e.g. 95"
                  type="number"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-feedback">Feedback</Label>
                <textarea
                  id="review-feedback"
                  rows={6}
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="Feedback for the student"
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[140px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Grade & Feedback"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Current Grade</span>
                <span className="font-medium">
                  {submission.grade ?? "Not graded"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Graded At</span>
                <span className="font-medium">
                  {submission.gradedAt
                    ? new Date(submission.gradedAt).toLocaleString()
                    : "Not graded"}
                </span>
              </div>
              <Separator />
              <p className="text-muted-foreground text-xs">
                Feedback and grade are saved independently, so you can update
                either field at any time.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function TeacherSubmissionReviewPage({
  params,
}: {
  params: Promise<{ id: string; assignmentId: string; submissionId: string }>;
}) {
  const { id, assignmentId, submissionId } = use(params);

  return (
    <main>
      <Unauthenticated>
        <div className="container mx-auto max-w-xl p-6">
          <Card>
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                Sign in to review this submission.
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
        <ReviewContent
          classroomId={id as Id<"classrooms">}
          assignmentId={assignmentId as Id<"assignments">}
          submissionId={submissionId as Id<"submissions">}
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
