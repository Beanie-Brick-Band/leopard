"use client";

import { use, useState } from "react";
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
import { Input } from "@package/ui/input";
import { Label } from "@package/ui/label";
import { Separator } from "@package/ui/separator";
import { Spinner } from "@package/ui/spinner";

import { Editor } from "~/components/editor";
import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";

function SubmissionCard({
  submission,
  onGrade,
}: {
  submission: any;
  onGrade: (
    submissionId: Id<"submissions">,
    grade: number,
    feedback: string,
  ) => Promise<void>;
}) {
  const [isGrading, setIsGrading] = useState(false);
  const [grade, setGrade] = useState(submission.grade?.toString() || "");
  const [feedback, setFeedback] = useState(submission.feedback || "");

  const handleGrade = async () => {
    const gradeNum = parseFloat(grade);
    if (isNaN(gradeNum)) {
      toast.error("Please enter a valid grade");
      return;
    }

    setIsGrading(true);
    try {
      await onGrade(submission._id, gradeNum, feedback);
      toast.success("Submission graded successfully!");
    } catch (error) {
      toast.error("Failed to grade submission");
      console.error(error);
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              Student ID: {submission.studentId}
            </CardTitle>
            <CardDescription>
              {submission.submitted ? (
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Submitted on{" "}
                  {new Date(submission.submittedAt).toLocaleString()}
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1 text-sm">
                  <XCircle className="h-3 w-3" />
                  Not submitted
                </span>
              )}
            </CardDescription>
          </div>
          {submission.grade !== undefined && (
            <div className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-lg font-bold">
              {submission.grade}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {submission.submitted && (
          <>
            <div className="space-y-2">
              <Label htmlFor={`grade-${submission._id}`}>Grade</Label>
              <Input
                id={`grade-${submission._id}`}
                type="number"
                step="0.01"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="Enter grade (e.g., 95.5)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`feedback-${submission._id}`}>Feedback</Label>
              <textarea
                id={`feedback-${submission._id}`}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide feedback to the student..."
              />
            </div>
            <Button onClick={handleGrade} disabled={isGrading}>
              {isGrading ? <Spinner /> : "Save Grade"}
            </Button>
          </>
        )}
        {submission.gradedAt && (
          <p className="text-muted-foreground text-xs">
            Graded on: {new Date(submission.gradedAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Content({
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

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedDueDate, setEditedDueDate] = useState("");
  const [editedTemplateId, setEditedTemplateId] = useState("");

  if (!assignment) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const handleEdit = () => {
    setEditedName(assignment.name);
    setEditedDescription(assignment.description);
    setEditedDueDate(assignment.dueDate);
    setEditedTemplateId(assignment.templateId || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateAssignment({
        assignmentId,
        name: editedName,
        description: editedDescription,
        dueDate: editedDueDate,
        templateId: editedTemplateId || undefined,
      });
      toast.success("Assignment updated successfully!");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update assignment");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this assignment? This will also delete all submissions. This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAssignment({ assignmentId });
      toast.success("Assignment deleted successfully");
      window.location.href = `/teacher/classroom/${classroomId}`;
    } catch (error) {
      toast.error("Failed to delete assignment");
      console.error(error);
      setIsDeleting(false);
    }
  };

  const handleGrade = async (
    submissionId: Id<"submissions">,
    grade: number,
    feedback: string,
  ) => {
    await gradeSubmission({
      submissionId,
      grade,
      feedback: feedback || undefined,
    });
  };

  const dueDate = new Date(assignment.dueDate);
  const submittedCount = submissions?.filter((s) => s.submitted).length || 0;
  const gradedCount =
    submissions?.filter((s) => s.grade !== undefined).length || 0;
  const totalStudents = submissions?.length || 0;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link
          href={`/teacher/classroom/${classroomId}`}
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
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {submittedCount} / {totalStudents} submitted
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                {gradedCount} / {submittedCount} graded
              </span>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Editor
                  content={editedDescription}
                  onChange={setEditedDescription}
                  placeholder="Enter assignment description..."
                />
              ) : (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: assignment.description }}
                />
              )}
            </CardContent>
          </Card>

          {/* Submissions */}
          <div>
            <h2 className="mb-4 text-2xl font-semibold">Submissions</h2>
            <div className="space-y-4">
              {submissions && submissions.length > 0 ? (
                submissions.map((submission) => (
                  <SubmissionCard
                    key={submission._id}
                    submission={submission}
                    onGrade={handleGrade}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-muted-foreground">
                      No submissions yet from enrolled students.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Settings */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assignment Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="datetime-local"
                      value={editedDueDate}
                      onChange={(e) => setEditedDueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="templateId">Template ID</Label>
                    <Input
                      id="templateId"
                      value={editedTemplateId}
                      onChange={(e) => setEditedTemplateId(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      {isSaving ? (
                        <Spinner />
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                      disabled={isSaving}
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
                      <p className="font-medium">{dueDate.toLocaleString()}</p>
                    </div>
                    {assignment.templateId && (
                      <div>
                        <p className="text-muted-foreground text-xs uppercase">
                          Template
                        </p>
                        <p className="font-mono text-sm">
                          {assignment.templateId}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground text-xs uppercase">
                        Created
                      </p>
                      <p className="text-sm">
                        {new Date(assignment.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <Button onClick={handleEdit} className="w-full">
                    Edit Assignment
                  </Button>
                  <Button
                    onClick={handleDelete}
                    variant="destructive"
                    className="w-full"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Spinner />
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

          {/* Stats Card */}
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
              {gradedCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    Avg Grade
                  </span>
                  <span className="font-semibold">
                    {(
                      submissions!
                        .filter((s) => s.grade !== undefined)
                        .reduce((sum, s) => sum + s.grade!, 0) / gradedCount
                    ).toFixed(1)}
                  </span>
                </div>
              )}
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
          <Spinner />
        </div>
      </AuthLoading>
    </main>
  );
}
