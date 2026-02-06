"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
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

import { Editor } from "~/components/editor";
import { MarkdownViewer } from "~/components/markdown-viewer";
import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";

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

  const dueDateValue = new Date(assignment.dueDate);
  const totalStudents = submissions?.length ?? 0;
  const submittedCount = submissions?.length ?? 0;
  const gradedCount =
    submissions?.filter((submission) => submission.grade !== undefined)
      .length ?? 0;
  const sortedSubmissions =
    submissions?.slice().sort((a, b) => b.submittedAt - a.submittedAt) ?? [];

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
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead className="bg-muted/40">
                        <tr className="border-b">
                          <th className="px-4 py-3 text-left font-medium">
                            Student
                          </th>
                          <th className="px-4 py-3 text-left font-medium">
                            Submitted
                          </th>
                          <th className="px-4 py-3 text-left font-medium">
                            Grade
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedSubmissions.map((submission) => (
                          <tr
                            key={submission._id}
                            className="border-b last:border-b-0"
                          >
                            <td className="px-4 py-3 align-top">
                              <p className="font-medium">
                                {submission.studentName ??
                                  submission.studentEmail?.split("@")[0] ??
                                  submission.studentId}
                              </p>
                            </td>
                            <td className="text-muted-foreground px-4 py-3 align-top">
                              {new Date(
                                submission.submittedAt,
                              ).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 align-top">
                              {submission.grade !== undefined ? (
                                <span className="font-medium">
                                  {submission.grade}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Not graded
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right align-top">
                              <Button asChild variant="outline">
                                <Link
                                  href={`/teacher/classroom/${classroomId}/assignment/${assignmentId}/review/${submission._id}`}
                                >
                                  Review
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
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
