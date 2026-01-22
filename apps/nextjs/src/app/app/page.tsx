"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import type { Id } from "@package/backend/convex/_generated/dataModel";
import { api } from "@package/backend/convex/_generated/api";
import { cn } from "@package/ui";
import { Button } from "@package/ui/button";
import { Separator } from "@package/ui/separator";
import { Spinner } from "@package/ui/spinner";

import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";
import { launchWorkspace } from "./actions";

function AssignmentItem({
  assignmentId,
  isLast = false,
  isEnrolled,
  classroomId,
}: {
  assignmentId: Id<"assignments">;
  isLast?: boolean;
  isEnrolled: boolean;
  classroomId: Id<"classrooms">;
}) {
  const assignment = useQuery(api.web.assignment.getById, { id: assignmentId });
  const submission = useQuery(
    api.web.submissions.getMySubmissionForAssignment,
    { assignmentId },
  );
  const submitAssignment = useMutation(api.web.submissions.submitAssignment);

  // We must use server actions to set appropriate cookies
  const [state, action, pending] = useActionState(
    () => launchWorkspace(assignmentId),
    null,
  );

  useEffect(() => {
    if (state) {
      window.location.assign(state);
    }
  }, [state]);

  const handleSubmit = async () => {
    try {
      await submitAssignment({ assignmentId });
      toast.success("Assignment submitted successfully!");
    } catch (error) {
      toast.error("Failed to submit assignment");
      console.error(error);
    }
  };

  if (!assignment) return null;

  const isSubmitted = submission?.submitted ?? false;
  const isGraded = submission?.grade !== undefined;

  return (
    <div className={cn("border-t py-4 text-sm", isLast && "border-b")}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium">{assignment.name}</div>
          <div className="text-muted-foreground text-xs">
            Due: {new Date(assignment.dueDate).toLocaleDateString()}
          </div>
          {assignment.description && (
            <div
              className="text-muted-foreground prose prose-sm dark:prose-invert mt-1 line-clamp-2 max-w-none text-xs"
              dangerouslySetInnerHTML={{ __html: assignment.description }}
            />
          )}
          {isSubmitted && (
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                Submitted
              </span>
              {isGraded && (
                <span className="text-xs">
                  Grade: {submission.grade}
                  {submission.feedback && ` - ${submission.feedback}`}
                </span>
              )}
            </div>
          )}
        </div>
        {isEnrolled && (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                startTransition(action);
              }}
              variant="outline"
              size="sm"
            >
              {pending ? <Spinner></Spinner> : "Launch Workspace"}
            </Button>
            {!isSubmitted && !isGraded && (
              <Button onClick={handleSubmit} size="sm">
                Submit
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type Classroom = {
  _id: Id<"classrooms">;
  _creationTime: number;
  description: string;
  createdAt: number;
  className: string;
  ownerId: string;
  enrollmentRequiresApproval: boolean;
};

function ClassroomCard({
  classroom,
  isEnrolled,
}: {
  classroom: Classroom;
  isEnrolled: boolean;
}) {
  const assignments = useQuery(
    api.web.teacherAssignments.getAssignmentsByClassroom,
    isEnrolled ? { classroomId: classroom._id } : "skip",
  );
  const enroll = useMutation(api.web.classroom.enroll);

  const handleEnroll = async () => {
    try {
      await enroll({ classroomId: classroom._id });
      toast.success("Enrolled successfully!");
    } catch (error) {
      toast.error("Failed to enroll in classroom.");
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{classroom.className}</h3>
          <p className="text-muted-foreground text-sm">
            {classroom.description}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm">
            {assignments?.length ?? 0} assignments
          </span>
          {!isEnrolled && (
            <Button onClick={handleEnroll} size="sm">
              Enroll
            </Button>
          )}
        </div>
      </div>
      {assignments && assignments.length > 0 && (
        <div className="flex flex-col">
          {assignments.map((assignment, index) => (
            <AssignmentItem
              key={assignment._id}
              assignmentId={assignment._id}
              isLast={index === assignments.length - 1}
              isEnrolled={isEnrolled}
              classroomId={classroom._id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Content() {
  const enrolledClassrooms = useQuery(api.web.classroom.getEnrolled);
  const classroomsAvailableToEnroll = useQuery(
    api.web.classroom.getAvailableToEnroll,
  );

  return (
    <div className="container mx-auto space-y-12 p-6">
      {/* Enrolled Classrooms */}
      <section>
        <h2 className="mb-6 text-2xl font-bold">My Classrooms</h2>
        {enrolledClassrooms && enrolledClassrooms.length > 0 ? (
          <div className="space-y-6">
            {enrolledClassrooms
              .filter(
                (classroom): classroom is NonNullable<typeof classroom> =>
                  classroom !== null,
              )
              .map((classroom) => (
                <div key={classroom._id}>
                  <ClassroomCard classroom={classroom} isEnrolled={true} />
                  <Separator className="mt-6" />
                </div>
              ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No enrolled classrooms yet.</p>
        )}
      </section>

      {/* Available Classrooms */}
      {classroomsAvailableToEnroll &&
        classroomsAvailableToEnroll.length > 0 && (
          <>
            <section>
              <h2 className="mb-6 text-2xl font-bold">Available Classrooms</h2>
              <div className="space-y-6">
                {classroomsAvailableToEnroll.map((classroom, index) => (
                  <div key={classroom._id}>
                    <ClassroomCard classroom={classroom} isEnrolled={false} />
                    {index < classroomsAvailableToEnroll.length - 1 && (
                      <Separator className="mt-6" />
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
    </div>
  );
}

export default function Page() {
  return (
    <main>
      <Unauthenticated>Logged out</Unauthenticated>
      <Authenticated>
        <Content />
      </Authenticated>
      <AuthLoading>
        <div className="p-8">Loading...</div>
      </AuthLoading>
    </main>
  );
}
