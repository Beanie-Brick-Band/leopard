"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
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
      <CardHeader>
        <CardTitle className="text-base">{submission.studentId}</CardTitle>
        <CardDescription>
          Submitted {new Date(submission.submittedAt).toLocaleString()}
        </CardDescription>
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
      <div className="flex min-h-[300px] items-center justify-center">
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

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div className="space-y-2">
        <Link
          href={`/teacher/classroom/${classroomId}`}
          className="text-muted-foreground text-sm underline"
        >
          Back to Classroom
        </Link>
        <h1 className="text-3xl font-bold">{assignment.name}</h1>
        <p className="text-muted-foreground text-sm">
          Release {new Date(assignment.releaseDate).toLocaleString()} • Due{" "}
          {new Date(assignment.dueDate).toLocaleString()}
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Assignment Details</CardTitle>
            <CardDescription>Edit assignment settings</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing((value) => !value)}
            >
              {isEditing ? "Cancel" : "Edit"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAssignment}
              disabled={isDeletingAssignment}
            >
              {isDeletingAssignment ? "Deleting..." : "Delete"}
            </Button>
          </div>
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
                <Label htmlFor="assignment-description">Description</Label>
                <textarea
                  id="assignment-description"
                  rows={8}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[160px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assignment-release-date">Release Date</Label>
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
              </div>
              <Button
                onClick={handleSaveAssignment}
                disabled={isSavingAssignment}
              >
                {isSavingAssignment ? "Saving..." : "Save Assignment"}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm whitespace-pre-wrap">
                {assignment.description ?? "No description"}
              </p>
              <p className="text-muted-foreground text-sm">
                Release {new Date(assignment.releaseDate).toLocaleString()}
              </p>
              <p className="text-muted-foreground text-sm">
                Due {new Date(assignment.dueDate).toLocaleString()}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Submissions</h2>
        {submissions === undefined ? (
          <div className="flex min-h-[120px] items-center justify-center">
            <Spinner />
          </div>
        ) : submissions.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-6 text-sm">
              No submissions yet.
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
