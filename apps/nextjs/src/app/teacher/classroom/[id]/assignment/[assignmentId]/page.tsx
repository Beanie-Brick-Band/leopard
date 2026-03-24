"use client";

import type { ColDef } from "ag-grid-community";
import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Save,
  Send,
  Trash2,
  Users,
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
import { Input } from "@package/ui/input";
import { Label } from "@package/ui/label";
import { Separator } from "@package/ui/separator";
import { Spinner } from "@package/ui/spinner";

import { AppDataGrid } from "~/components/app-data-grid";
import { Editor } from "~/components/editor";
import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";
import { StarterCodeCard } from "./starter-code-card";

function formatDateForInput(timestamp: number) {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function AssignmentContent({
  classroomId,
  assignmentId,
}: {
  classroomId: Id<"classrooms">;
  assignmentId: Id<"assignments">;
}) {
  const assignment = useQuery(api.web.assignment.getById, { id: assignmentId });
  const submissions = useQuery(
    api.web.teacherAssignments.getSubmissionsByAssignment,
    {
      assignmentId,
    },
  );
  const updateAssignment = useMutation(
    api.web.teacherAssignments.updateAssignment,
  );
  const deleteAssignment = useMutation(
    api.web.teacherAssignments.deleteAssignment,
  );
  type UpdateAssignmentArgs = Parameters<typeof updateAssignment>[0];

  // Unfortunate inline type definition for draft
  interface AssignmentDraft {
    name: NonNullable<UpdateAssignmentArgs["name"]>;
    description: NonNullable<UpdateAssignmentArgs["description"]>;
    releaseDate: string;
    dueDate: string;
  }

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<AssignmentDraft | null>(null);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  const [isDeletingAssignment, setIsDeletingAssignment] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isHideGradesDialogOpen, setIsHideGradesDialogOpen] = useState(false);

  if (assignment === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const startEditing = () => {
    setDraft({
      name: assignment.name,
      description: assignment.description ?? "",
      releaseDate: formatDateForInput(assignment.releaseDate),
      dueDate: formatDateForInput(assignment.dueDate),
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft(null);
    setIsEditing(false);
  };

  const updateDraft = (updates: Partial<AssignmentDraft>) => {
    setDraft((currentDraft) =>
      currentDraft ? { ...currentDraft, ...updates } : currentDraft,
    );
  };

  const save = async () => {
    if (!draft) {
      return;
    }

    setIsSavingAssignment(true);

    try {
      const parsedReleaseDate = Date.parse(draft.releaseDate);
      const parsedDueDate = Date.parse(draft.dueDate);

      if (Number.isNaN(parsedReleaseDate) || Number.isNaN(parsedDueDate)) {
        throw new Error("Invalid date values");
      }
      if (parsedDueDate <= parsedReleaseDate) {
        throw new Error("Due date must be after release date");
      }
      if (!draft.name.trim()) {
        throw new Error("Assignment name is required");
      }

      await updateAssignment({
        assignmentId,
        name: draft.name.trim(),
        description: draft.description,
        releaseDate: parsedReleaseDate,
        dueDate: parsedDueDate,
      });
      toast.success("Assignment updated");
      cancelEditing();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update assignment",
      );
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!confirm("Delete this assignment and all related submissions?")) {
      return;
    }

    setIsDeletingAssignment(true);
    try {
      await deleteAssignment({ assignmentId });
      toast.success("Assignment deleted");
      window.location.assign(`/teacher/classroom/${classroomId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete assignment",
      );
      setIsDeletingAssignment(false);
    }
  };

  const dueDateValue = new Date(assignment.dueDate);
  const editorContent = isEditing
    ? (draft?.description ?? "")
    : assignment.description;
  const editorKey = isEditing
    ? "editing"
    : `view-${assignment.description ?? ""}`;
  const totalStudents = submissions?.length ?? 0;
  const submittedCount = submissions?.length ?? 0;
  const gradedCount =
    submissions?.filter((submission) => submission.grade !== undefined)
      .length ?? 0;
  const publishedCount =
    submissions?.reduce(
      (acc, submission) => acc + (submission.gradesReleased ? 1 : 0),
      0,
    ) ?? 0;
  const sortedSubmissions =
    submissions?.slice().sort((a, b) => b.submittedAt - a.submittedAt) ?? [];
  const unreleasedGradedCount =
    submissions?.filter((s) => s.grade !== undefined && !s.gradesReleased)
      .length ?? 0;

  const submissionRows = sortedSubmissions.map((submission) => {
    const studentName =
      submission.studentName ??
      submission.studentEmail?.split("@")[0] ??
      submission.studentId;

    return {
      grade: submission.grade ?? null,
      flagged: submission.flagged ? "Flagged" : "Clear",
      href: `/teacher/classroom/${classroomId}/assignment/${assignmentId}/review/${submission._id}`,
      studentLabel: `${studentName} ${submission.studentEmail ?? ""} ${submission.studentId}`,
      studentName,
      submittedAtIso: new Date(submission.submittedAt).toISOString(),
    };
  });
  const submissionColumnDefs: ColDef<(typeof submissionRows)[number]>[] = [
    {
      field: "studentLabel",
      headerName: "Student",
      minWidth: 240,
      cellRenderer: ({ data }: { data?: (typeof submissionRows)[number] }) =>
        data ? <p className="font-medium">{data.studentName}</p> : null,
    },
    {
      field: "submittedAtIso",
      headerName: "Submitted",
      minWidth: 220,
      sort: "desc",
      valueFormatter: ({ value }) =>
        typeof value === "string" ? new Date(value).toLocaleString() : "",
    },
    {
      field: "flagged",
      headerName: "Flagged",
      filter: "agTextColumnFilter",
      flex: 0,
      maxWidth: 120,
      minWidth: 100,
      cellRenderer: ({
        value,
      }: {
        value?: (typeof submissionRows)[number]["flagged"];
      }) =>
        value === "Flagged" ? (
          <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5 text-xs font-medium dark:bg-red-300">
            Flagged
          </span>
        ) : null,
    },
    {
      field: "grade",
      headerName: "Grade",
      filter: "agNumberColumnFilter",
      flex: 0,
      maxWidth: 150,
      minWidth: 120,
      valueFormatter: ({ value }) =>
        typeof value === "number" ? `${value}` : "Not graded",
      cellRenderer: ({
        value,
      }: {
        value?: (typeof submissionRows)[number]["grade"];
      }) =>
        typeof value === "number" ? (
          <span className="font-medium">{value}</span>
        ) : (
          <span className="text-muted-foreground">Not graded</span>
        ),
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-4">
        <Link
          href={`/teacher/classroom/${classroomId}`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Classroom
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div>
            <h1 className="mb-2 text-3xl font-bold">{assignment.name}</h1>
            <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Due: {dueDateValue.toLocaleDateString()}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {dueDateValue.toLocaleTimeString()}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" />
                {submittedCount} / {totalStudents} submitted
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                {gradedCount} / {submittedCount} graded
              </span>
            </div>
          </div>

          <Separator />

          <Editor
            key={editorKey}
            content={editorContent ?? ""}
            onChange={(content) => {
              if (!isEditing || !draft) {
                return;
              }
              updateDraft({ description: content });
            }}
            placeholder="Enter assignment description..."
            editable={isEditing}
          />

          <section className="space-y-4">
            <div className="flex items-end justify-between">
              <h2 className="text-2xl font-semibold">Submissions</h2>
            </div>
            {submissions === undefined ? (
              <div className="flex min-h-[120px] items-center justify-center">
                <Spinner />
              </div>
            ) : (
              <AppDataGrid
                columnDefs={submissionColumnDefs}
                onRowNavigate={(row) => row.href}
                rowData={submissionRows}
              />
            )}
          </section>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assignment Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="assignment-name">Name</Label>
                    <Input
                      id="assignment-name"
                      value={draft?.name ?? ""}
                      onChange={(event) =>
                        updateDraft({ name: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignment-release-date">
                      Release Date
                    </Label>
                    <Input
                      id="assignment-release-date"
                      type="datetime-local"
                      value={draft?.releaseDate ?? ""}
                      onChange={(event) =>
                        updateDraft({ releaseDate: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignment-due-date">Due Date</Label>
                    <Input
                      id="assignment-due-date"
                      type="datetime-local"
                      value={draft?.dueDate ?? ""}
                      onChange={(event) =>
                        updateDraft({ dueDate: event.target.value })
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={save}
                      disabled={isSavingAssignment}
                    >
                      {isSavingAssignment ? (
                        "Saving..."
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={cancelEditing}
                      disabled={isSavingAssignment}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase">
                        Name
                      </p>
                      <p className="font-medium">{assignment.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase">
                        Due Date
                      </p>
                      <p className="font-medium">
                        {new Date(assignment.dueDate).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase">
                        Release Date
                      </p>
                      <p className="font-medium">
                        {new Date(assignment.releaseDate).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase">
                        Created
                      </p>
                      <p className="text-sm">
                        {new Date(assignment._creationTime).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <Button onClick={startEditing} className="w-full">
                    Edit Assignment
                  </Button>
                  <Button
                    onClick={handleDeleteAssignment}
                    variant="destructive"
                    className="w-full"
                    disabled={isDeletingAssignment}
                  >
                    {isDeletingAssignment ? (
                      "Deleting..."
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Assignment
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  Total Students
                </span>
                <span className="font-semibold">{totalStudents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Submitted</span>
                <span className="font-semibold">
                  {submittedCount} (
                  {totalStudents > 0
                    ? Math.round((submittedCount / totalStudents) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Graded</span>
                <span className="font-semibold">
                  {gradedCount} (
                  {submittedCount > 0
                    ? Math.round((gradedCount / submittedCount) * 100)
                    : 0}
                  %)
                </span>
              </div>
              {gradedCount > 0 && submissions ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    Avg Grade
                  </span>
                  <span className="font-semibold">
                    {(
                      submissions
                        .filter((submission) => submission.grade !== undefined)
                        .reduce(
                          (sum, submission) => sum + (submission.grade ?? 0),
                          0,
                        ) / gradedCount
                    ).toFixed(1)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Published</span>
                <span className="font-semibold">
                  {publishedCount} (
                  {submittedCount > 0
                    ? Math.round((publishedCount / submittedCount) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <Separator />
              {submissions === undefined ||
              gradedCount === 0 ? null : unreleasedGradedCount > 0 ? (
                <Button
                  className="w-full"
                  onClick={() => setIsPublishDialogOpen(true)}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Publish Grades
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => setIsHideGradesDialogOpen(true)}
                >
                  Hide Grades
                </Button>
              )}
            </CardContent>
          </Card>

          <StarterCodeCard assignmentId={assignmentId} />
        </div>
      </div>

      <PublishConfirmationDialog
        open={isPublishDialogOpen}
        onClose={() => setIsPublishDialogOpen(false)}
        assignmentId={assignmentId}
        assignmentName={assignment.name}
        gradedCount={unreleasedGradedCount}
      />

      <HideGradesConfirmationDialog
        open={isHideGradesDialogOpen}
        onClose={() => setIsHideGradesDialogOpen(false)}
        assignmentId={assignmentId}
        assignmentName={assignment.name}
        publishedCount={publishedCount}
      />
    </div>
  );
}

export default function TeacherAssignmentPage({
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
        <AssignmentContent
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

interface PublishConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  assignmentId: Id<"assignments">;
  assignmentName: string;
  gradedCount: number;
}

function PublishConfirmationDialog({
  open,
  onClose,
  assignmentId,
  assignmentName,
  gradedCount,
}: PublishConfirmationDialogProps) {
  const publishGrades = useMutation(api.web.teacherAssignments.publishGrades);
  const [isPublishing, setIsPublishing] = useState(false);

  const handleConfirm = async () => {
    setIsPublishing(true);
    try {
      await publishGrades({ assignmentId });
      toast.success("All grades published.");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to publish grades",
      );
    } finally {
      setIsPublishing(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>Publish All Grades?</CardTitle>
          <CardDescription>
            Students will immediately be able to view their grades and feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 rounded-md border p-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Assignment</span>
              <span className="font-medium">{assignmentName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Grades to publish</span>
              <span className="font-medium">{gradedCount}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isPublishing}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isPublishing}>
              {isPublishing ? (
                "Publishing..."
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Confirm Publish
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface HideGradesConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  assignmentId: Id<"assignments">;
  assignmentName: string;
  publishedCount: number;
}

function HideGradesConfirmationDialog({
  open,
  onClose,
  assignmentId,
  assignmentName,
  publishedCount,
}: HideGradesConfirmationDialogProps) {
  const hideGrades = useMutation(api.web.teacherAssignments.hideGrades);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await hideGrades({ assignmentId });
      toast.success("All grades hidden.");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to hide grades",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle>Hide All Grades?</CardTitle>
          <CardDescription>
            Students will immediately not able to view their grades and
            feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 rounded-md border p-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Assignment</span>
              <span className="font-medium">{assignmentName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Published grades</span>
              <span className="font-medium">{publishedCount}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? "Hiding grades..." : "Confirm to Hide Grades"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
