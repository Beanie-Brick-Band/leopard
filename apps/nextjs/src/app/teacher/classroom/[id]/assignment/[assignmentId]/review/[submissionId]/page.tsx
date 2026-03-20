"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flag,
} from "lucide-react";
import { toast } from "sonner";

import type { Id } from "@package/backend/convex/_generated/dataModel";
import { api } from "@package/backend/convex/_generated/api";
import { cn } from "@package/ui";
import { Button } from "@package/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@package/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@package/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@package/ui/input-group";
import { Label } from "@package/ui/label";
import { Separator } from "@package/ui/separator";
import { Spinner } from "@package/ui/spinner";

import { TextReplayScrubberComponent } from "~/components/scrubber";
import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";

function sanitizeGradeInput(value: string) {
  const digitsAndDotsOnly = value.replace(/[^\d.]/g, "");
  const [whole = "", ...decimalParts] = digitsAndDotsOnly.split(".");

  if (decimalParts.length === 0) {
    return whole;
  }

  return `${whole}.${decimalParts.join("")}`;
}

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
  const submissions = useQuery(
    api.web.teacherAssignments.getSubmissionsByAssignment,
    { assignmentId },
  );
  const submission = useQuery(api.web.teacherAssignments.getSubmissionById, {
    submissionId,
  });
  const gradeSubmission = useMutation(
    api.web.teacherAssignments.gradeSubmission,
  );
  const provideSubmissionFeedback = useMutation(
    api.web.teacherAssignments.provideSubmissionFeedback,
  );

  const toggleSubmissionFlag = useMutation(
    api.web.submission.toggleSubmissionFlag,
  );

  const searchParams = useSearchParams();
  const [newGrade, setNewGrade] = useState<string | null>(null);
  const [newFeedback, setNewFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "ungraded" | "flagged">(
    () => {
      const urlFilter = searchParams.get("filter");
      return urlFilter === "all" ||
        urlFilter === "ungraded" ||
        urlFilter === "flagged"
        ? urlFilter
        : "all";
    },
  );
  const [showOverHundredConfirm, setShowOverHundredConfirm] = useState(false);
  const studentDisplayName =
    submission?.studentName ??
    submission?.studentEmail?.split("@")[0] ??
    submission?.studentId;

  const sortedSubmissions = useMemo(
    () =>
      submissions?.slice().sort((a, b) => b.submittedAt - a.submittedAt) ?? [],
    [submissions],
  );

  const currentSubmissionIndex = sortedSubmissions.findIndex(
    (item) => item._id === submissionId,
  );

  const matchesActiveFilter = useCallback(
    (submissionItem: { grade?: number; flagged?: boolean }) => {
      switch (filterMode) {
        case "ungraded":
          return submissionItem.grade === undefined;
        case "flagged":
          return Boolean(submissionItem.flagged);
        case "all":
        default:
          return true;
      }
    },
    [filterMode],
  );

  const previousSubmission = useMemo(() => {
    if (currentSubmissionIndex < 0) {
      return null;
    }

    for (let index = currentSubmissionIndex - 1; index >= 0; index -= 1) {
      const candidate = sortedSubmissions[index];
      if (candidate && matchesActiveFilter(candidate)) {
        return candidate;
      }
    }

    return null;
  }, [currentSubmissionIndex, matchesActiveFilter, sortedSubmissions]);

  const nextSubmission = useMemo(() => {
    if (currentSubmissionIndex < 0) {
      return null;
    }

    for (
      let index = currentSubmissionIndex + 1;
      index < sortedSubmissions.length;
      index += 1
    ) {
      const candidate = sortedSubmissions[index];
      if (candidate && matchesActiveFilter(candidate)) {
        return candidate;
      }
    }

    return null;
  }, [currentSubmissionIndex, matchesActiveFilter, sortedSubmissions]);

  useEffect(() => {
    if (!showOverHundredConfirm) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowOverHundredConfirm(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showOverHundredConfirm]);

  if (assignment === undefined || submission === undefined) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const displayGrade = newGrade ?? submission.grade?.toString() ?? "";
  const displayFeedback = newFeedback ?? submission.submissionFeedback ?? "";

  const saveReview = async (nextGrade: number | null) => {
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
          feedback: displayFeedback,
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

  const handleSave = async () => {
    if (displayGrade.trim() === "") {
      toast.error("Grade is required");
      return;
    }

    const nextGrade = Number.isNaN(Number(displayGrade))
      ? Number.NaN
      : Number(displayGrade);

    if (Number.isNaN(nextGrade)) {
      toast.error("Grade must be a valid number");
      return;
    }

    if (nextGrade < 0) {
      toast.error("Grade must be 0 or higher");
      return;
    }

    if (nextGrade > 100) {
      setShowOverHundredConfirm(true);
      return;
    }

    await saveReview(nextGrade);
  };

  return (
    <>
      {showOverHundredConfirm ? (
        <div
          className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowOverHundredConfirm(false);
            }
          }}
        >
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle>Save Grade Above 100?</CardTitle>
              <CardDescription>
                This grade is higher than 100. Confirm if you want to save it
                anyway.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-md px-3 py-2 text-sm">
                Grade to save:{" "}
                <span className="font-medium">{displayGrade}</span>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowOverHundredConfirm(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setShowOverHundredConfirm(false);
                    await saveReview(Number(displayGrade));
                  }}
                  disabled={isSaving}
                >
                  Confirm Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="container mx-auto p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link
            href={`/teacher/classroom/${classroomId}/assignment/${assignmentId}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assignment
          </Link>
        </div>

        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="lg"
              asChild={Boolean(previousSubmission)}
              disabled={!previousSubmission}
              className={cn(
                "w-32 px-6 whitespace-nowrap",
                !previousSubmission && "opacity-50",
              )}
            >
              {previousSubmission ? (
                <Link
                  href={`/teacher/classroom/${classroomId}/assignment/${assignmentId}/review/${previousSubmission._id}?filter=${filterMode}`}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Link>
              ) : (
                <span className="flex items-center gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </span>
              )}
            </Button>
            <Button
              variant="default"
              size="lg"
              asChild={Boolean(nextSubmission)}
              disabled={!nextSubmission}
              className={cn(
                "w-32 px-6 whitespace-nowrap",
                !nextSubmission && "opacity-50",
              )}
            >
              {nextSubmission ? (
                <Link
                  href={`/teacher/classroom/${classroomId}/assignment/${assignmentId}/review/${nextSubmission._id}?filter=${filterMode}`}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="flex items-center gap-2">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={filterMode === "all" ? "outline" : "default"}
                  size="lg"
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => setFilterMode("all")}
                  className={cn(filterMode === "all" && "bg-muted")}
                >
                  All Submissions
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilterMode("ungraded")}
                  className={cn(filterMode === "ungraded" && "bg-muted")}
                >
                  Ungraded
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFilterMode("flagged")}
                  className={cn(filterMode === "flagged" && "bg-muted")}
                >
                  Flagged
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
                  <span className="text-muted-foreground">Grade</span>
                  <span className="font-medium">
                    {submission.grade !== undefined
                      ? `${submission.grade}%`
                      : "Not graded"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Workspace</span>
                  <span className="font-mono text-xs">
                    {submission.workspaceId ?? "Not linked"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Published</span>
                  <span className="font-medium">
                    {submission.gradesReleased ? (
                      <span className="text-accent-foreground inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Yes
                      </span>
                    ) : (
                      "No"
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <div className="flex justify-between pr-6">
                <CardHeader className="flex-1">
                  <CardTitle>Replay</CardTitle>
                  <CardDescription>
                    Scrub through the workspace edit history for this
                    submission.
                  </CardDescription>
                </CardHeader>
                <div>
                  <Button
                    className={cn(
                      "gap-2 font-medium text-white transition-all",
                      {
                        "bg-red-800 hover:bg-blue-500": submission.flagged,
                        "bg-red-700 hover:bg-red-600": !submission.flagged,
                      },
                    )}
                    onClick={() =>
                      toggleSubmissionFlag({ submissionId: submission._id })
                    }
                  >
                    <Flag className="h-4 w-4" />
                    {submission.flagged
                      ? "Unflag Submission"
                      : "Flag Submission"}
                  </Button>
                </div>
              </div>
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
                  <InputGroup>
                    <InputGroupInput
                      id="review-grade"
                      value={displayGrade}
                      onChange={(event) =>
                        setNewGrade(sanitizeGradeInput(event.target.value))
                      }
                      placeholder="e.g. 95"
                      type="text"
                      inputMode="decimal"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>%</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review-feedback">Feedback</Label>
                  <textarea
                    id="review-feedback"
                    rows={6}
                    value={displayFeedback}
                    onChange={(event) => setNewFeedback(event.target.value)}
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
                  <span className="text-muted-foreground">Grade</span>
                  <span className="font-medium">
                    {submission.grade !== undefined
                      ? `${submission.grade}%`
                      : "Not graded"}
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
    </>
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
