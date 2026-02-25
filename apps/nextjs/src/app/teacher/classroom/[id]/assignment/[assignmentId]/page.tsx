"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import type { Doc, Id } from "@package/backend/convex/_generated/dataModel";
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

import { Editor } from "~/components/editor";
import { MarkdownViewer } from "~/components/markdown-viewer";
import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";

function formatDateForInput(timestamp: number) {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function SubmissionCard({
  submission,
  onSave,
}: {
  submission: Doc<"submissions">;
  onSave: (
    submissionId: Id<"submissions">,
    grade: number | null,
    feedback: string,
  ) => Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [grade, setGrade] = useState(submission.grade?.toString() ?? "");
  const [feedback, setFeedback] = useState(submission.submissionFeedback ?? "");

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
      await onSave(submission._id, nextGrade, feedback);
      toast.success("Submission updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update submission",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="gap-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{submission.studentId}</CardTitle>
            <CardDescription>
              Submitted {new Date(submission.submittedAt).toLocaleString()}
            </CardDescription>
          </div>
          {submission.grade !== undefined && (
            <div className="bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-sm font-semibold">
              {submission.grade}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`grade-${submission._id}`}>Grade</Label>
            <Input
              id={`grade-${submission._id}`}
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              placeholder="e.g. 95"
              type="number"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`graded-at-${submission._id}`}>Graded At</Label>
            <Input
              id={`graded-at-${submission._id}`}
              readOnly
              value={
                submission.gradedAt
                  ? new Date(submission.gradedAt).toLocaleString()
                  : "Not graded"
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`feedback-${submission._id}`}>Feedback</Label>
          <textarea
            id={`feedback-${submission._id}`}
            rows={4}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Feedback for the student"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          />
        </div>

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Grade & Feedback"}
        </Button>
      </CardContent>
    </Card>
  );
}

function StarterCodeCard({
  assignmentId,
}: {
  assignmentId: Id<"assignments">;
}) {
  const assignment = useQuery(api.web.assignment.getById, { id: assignmentId });
  const getUploadUrl = useAction(
    api.web.teacherAssignmentActions.getStarterCodeUploadUrl,
  );
  const saveKey = useMutation(
    api.web.teacherAssignments.saveStarterCodeKey,
  );
  const removeCode = useAction(
    api.web.teacherAssignmentActions.removeStarterCode,
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const hasStarterCode = !!assignment?.starterCodeStorageKey;

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File must be under 50MB");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { uploadUrl, storageKey } = await getUploadUrl({
        assignmentId,
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        });
        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", "application/zip");
        xhr.send(file);
      });

      await saveKey({ assignmentId, storageKey });
      toast.success("Starter code uploaded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload failed",
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      event.target.value = "";
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remove starter code from this assignment?")) return;
    setIsRemoving(true);
    try {
      await removeCode({ assignmentId });
      toast.success("Starter code removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove",
      );
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Starter Code</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasStarterCode ? (
          <>
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Starter code uploaded</span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleRemove}
              disabled={isRemoving}
            >
              {isRemoving ? "Removing..." : "Remove Starter Code"}
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            No starter code uploaded.
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="starter-code-upload">
            {hasStarterCode ? "Replace" : "Upload"} Starter Code
          </Label>
          <Input
            id="starter-code-upload"
            type="file"
            accept=".zip"
            onChange={handleUpload}
            disabled={isUploading}
          />
          {isUploading && (
            <div className="space-y-1">
              <div className="bg-muted h-2 w-full rounded-full">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
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
  const gradeSubmission = useMutation(
    api.web.teacherAssignments.gradeSubmission,
  );
  const provideSubmissionFeedback = useMutation(
    api.web.teacherAssignments.provideSubmissionFeedback,
  );

  const [isEditing, setIsEditing] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [isDeletingAssignment, setIsDeletingAssignment] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (!assignment || isEditing) {
      return;
    }

    setName(assignment.name);
    setDescription(assignment.description ?? "");
    setReleaseDate(formatDateForInput(assignment.releaseDate));
    setDueDate(formatDateForInput(assignment.dueDate));
  }, [assignment, isEditing]);

  if (assignment === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const handleSaveAssignment = async () => {
    setIsSavingAssignment(true);

    try {
      const parsedReleaseDate = Date.parse(releaseDate);
      const parsedDueDate = Date.parse(dueDate);

      if (Number.isNaN(parsedReleaseDate) || Number.isNaN(parsedDueDate)) {
        throw new Error("Invalid date values");
      }
      if (parsedDueDate <= parsedReleaseDate) {
        throw new Error("Due date must be after release date");
      }
      if (!name.trim()) {
        throw new Error("Assignment name is required");
      }

      await updateAssignment({
        assignmentId,
        name: name.trim(),
        description: description.trim(),
        releaseDate: parsedReleaseDate,
        dueDate: parsedDueDate,
      });
      toast.success("Assignment updated");
      setIsEditing(false);
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

  const handleSaveSubmission = async (
    submissionId: Id<"submissions">,
    grade: number | null,
    feedback: string,
  ) => {
    if (grade !== null) {
      await gradeSubmission({
        submissionId,
        grade,
      });
    }

    await provideSubmissionFeedback({
      submissionId,
      feedback,
    });
  };

  const dueDateValue = new Date(assignment.dueDate);
  const totalStudents = submissions?.length ?? 0;
  const submittedCount = submissions?.length ?? 0;
  const gradedCount =
    submissions?.filter((submission) => submission.grade !== undefined)
      .length ?? 0;

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

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Editor
                  content={description}
                  onChange={setDescription}
                  placeholder="Enter assignment description..."
                />
              ) : assignment.description ? (
                <MarkdownViewer content={assignment.description} />
              ) : (
                <p className="text-muted-foreground text-sm">No description.</p>
              )}
            </CardContent>
          </Card>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Submissions</h2>
            {submissions === undefined ? (
              <div className="flex min-h-[120px] items-center justify-center">
                <Spinner />
              </div>
            ) : submissions.length === 0 ? (
              <Card>
                <CardContent className="text-muted-foreground py-10 text-center text-sm">
                  No submissions yet from enrolled students.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {submissions.map((submission) => (
                  <SubmissionCard
                    key={submission._id}
                    submission={submission}
                    onSave={handleSaveSubmission}
                  />
                ))}
              </div>
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
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignment-release-date">
                      Release Date
                    </Label>
                    <Input
                      id="assignment-release-date"
                      type="datetime-local"
                      value={releaseDate}
                      onChange={(event) => setReleaseDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignment-due-date">Due Date</Label>
                    <Input
                      id="assignment-due-date"
                      type="datetime-local"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handleSaveAssignment}
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
                      onClick={() => setIsEditing(false)}
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

                  <Button onClick={() => setIsEditing(true)} className="w-full">
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
            </CardContent>
          </Card>

          <StarterCodeCard assignmentId={assignmentId} />
        </div>
      </div>
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
