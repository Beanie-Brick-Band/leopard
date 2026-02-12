"use client";

import { startTransition, use, useActionState, useEffect } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
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

interface Classroom {
  _id: Id<"classrooms">;
  className: string;
  metadata: string;
}

function getClassroomSummary(metadata: string) {
  try {
    const parsed = JSON.parse(metadata) as { description?: unknown };
    if (typeof parsed.description === "string" && parsed.description.trim()) {
      return parsed.description;
    }
  } catch {
    // keep fallback
  }
  return "Open assignment details to view full instructions.";
}

function AssignmentCard({
  assignment,
  classroomId,
}: {
  assignment: {
    _id: Id<"assignments">;
    name: string;
    dueDate: number;
  };
  classroomId: Id<"classrooms">;
}) {
  const submissionResult = useQuery(
    api.web.submission.getOwnSubmissionsForAssignment,
    {
      assignmentId: assignment._id,
    },
  );
  const [workspaceUrl, launchAction, isLaunching] = useActionState(
    () => launchWorkspace(assignment._id),
    null as string | null,
  );

  useEffect(() => {
    if (workspaceUrl) {
      window.location.assign(workspaceUrl);
    }
  }, [workspaceUrl]);

  const hasSubmission = submissionResult?.success === true;
  const dueDate = new Date(assignment.dueDate);

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-lg">{assignment.name}</CardTitle>
            <CardDescription>Due {dueDate.toLocaleString()}</CardDescription>
          </div>
          {hasSubmission ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              <CheckCircle2 className="h-3 w-3" />
              Submitted
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              startTransition(launchAction);
            }}
            disabled={isLaunching}
          >
            {isLaunching ? "Launching..." : "Launch Workspace"}
          </Button>
          <Button size="sm" asChild>
            <Link
              href={`/student/classroom/${classroomId}/assignment/${assignment._id}`}
            >
              View Details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Content({ classroomId }: { classroomId: Id<"classrooms"> }) {
  const enrolled = useQuery(api.web.classroom.getEnrolled);
  const available = useQuery(api.web.classroom.getAvailableToEnroll);
  const enroll = useMutation(api.web.classroom.enroll);

  const enrolledClassroom = enrolled?.find(
    (classroom) => classroom?._id === classroomId,
  );
  const availableClassroom = available?.find(
    (classroom) => classroom._id === classroomId,
  );
  const classroom = (enrolledClassroom ??
    availableClassroom ??
    null) as Classroom | null;
  const isEnrolled = Boolean(enrolledClassroom);

  const assignments = useQuery(
    api.web.teacherAssignments.getAssignmentsByClassroom,
    isEnrolled ? { classroomId } : "skip",
  );

  const handleEnroll = async () => {
    try {
      await enroll({ classroomId });
      toast.success("Enrolled successfully.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Enrollment failed.",
      );
    }
  };

  if (enrolled === undefined || available === undefined) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground text-sm">
              Classroom not found.
            </p>
            <Button variant="outline" asChild className="mt-4">
              <Link href="/student">Back to Classes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="space-y-2">
        <Link
          href="/student"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          <span className="inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Classes
          </span>
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{classroom.className}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {getClassroomSummary(classroom.metadata)}
            </p>
          </div>
          {!isEnrolled ? (
            <Button onClick={handleEnroll}>Enroll</Button>
          ) : (
            <span className="text-muted-foreground inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
              Enrolled
            </span>
          )}
        </div>
      </div>

      <Separator />

      {!isEnrolled ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-sm">
            Enroll to view assignments and launch workspaces.
          </CardContent>
        </Card>
      ) : assignments === undefined ? (
        <div className="flex min-h-[180px] items-center justify-center">
          <Spinner />
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-sm">
            No assignments in this class yet.
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Assignments</h2>
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <AssignmentCard
                key={assignment._id}
                assignment={assignment}
                classroomId={classroomId}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function StudentClassroomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <main>
      <Unauthenticated>
        <div className="container mx-auto max-w-xl p-6">
          <Card>
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>Sign in to view this classroom.</CardDescription>
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
        <Content classroomId={id as Id<"classrooms">} />
      </Authenticated>
      <AuthLoading>
        <div className="flex min-h-[300px] items-center justify-center">
          <Spinner />
        </div>
      </AuthLoading>
    </main>
  );
}
