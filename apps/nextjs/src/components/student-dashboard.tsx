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

import { launchWorkspace } from "~/app/app/actions";

function AssignmentItem({
  assignmentId,
  isLast = false,
  isEnrolled,
}: {
  assignmentId: Id<"assignments">;
  isLast?: boolean;
  isEnrolled: boolean;
}) {
  const assignment = useQuery(api.web.assignment.getById, { id: assignmentId });
  const [state, action, pending] = useActionState(
    () => launchWorkspace(assignmentId),
    null,
  );

  useEffect(() => {
    if (state) {
      window.location.assign(state);
    }
  }, [state]);

  if (!assignment) return null;

  return (
    <div className={cn("border-t py-4 text-sm", isLast && "border-b")}>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{assignment.name}</div>
          <div className="text-muted-foreground text-xs">
            Due: {new Date(assignment.dueDate).toLocaleDateString()}
          </div>
        </div>
        {isEnrolled && (
          <Button
            onClick={() => {
              startTransition(action);
            }}
          >
            {pending ? <Spinner /> : "Launch Workspace"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const enrolledClassrooms = useQuery(api.web.classroom.getEnrolled);
  const classroomsAvailableToEnroll = useQuery(
    api.web.classroom.getAvailableToEnroll,
  );
  const enroll = useMutation(api.web.classroom.enroll);

  const handleEnroll = async (classroomId: Id<"classrooms">) => {
    try {
      await enroll({ classroomId });
    } catch {
      toast.error("Failed to enroll in classroom.");
    }
  };

  return (
    <div className="container mx-auto space-y-12 p-6">
      <section>
        <h2 className="mb-6 text-2xl font-bold">My Classrooms</h2>
        {enrolledClassrooms && enrolledClassrooms.length > 0 ? (
          <div className="space-y-6">
            {enrolledClassrooms
              .filter(
                (classroom): classroom is NonNullable<typeof classroom> =>
                  classroom !== null,
              )
              .sort((a, b) => b.assignments.length - a.assignments.length)
              .map((classroom) => (
                <div key={classroom._id}>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {classroom.className}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          Enrolled classroom
                        </p>
                      </div>
                      <span className="text-muted-foreground text-sm">
                        {classroom.assignments.length} assignments
                      </span>
                    </div>
                    {classroom.assignments.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <h4 className="text-muted-foreground text-sm font-medium">
                          Assignments:
                        </h4>
                        <div className="flex flex-col">
                          {classroom.assignments.map((assignmentId, index) => (
                            <AssignmentItem
                              key={assignmentId}
                              assignmentId={assignmentId}
                              isLast={index === classroom.assignments.length - 1}
                              isEnrolled={true}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No enrolled classrooms yet.</p>
        )}
      </section>

      {classroomsAvailableToEnroll && classroomsAvailableToEnroll.length > 0 && (
        <section>
          <h2 className="mb-6 text-2xl font-bold">Available Classrooms</h2>
          <div className="space-y-6">
            {classroomsAvailableToEnroll.map((classroom, index) => (
              <div key={classroom._id}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {classroom.className}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Available for enrollment
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground text-sm">
                        {classroom.assignments.length} assignments
                      </span>
                      <Button
                        onClick={() => handleEnroll(classroom._id)}
                        size="sm"
                      >
                        Enroll
                      </Button>
                    </div>
                  </div>
                  {classroom.assignments.length > 0 && (
                    <div className="ml-4 space-y-2">
                      <h4 className="text-muted-foreground text-sm font-medium">
                        Assignments:
                      </h4>
                      <div className="space-y-2">
                        {classroom.assignments.map((assignmentId) => (
                          <AssignmentItem
                            key={assignmentId}
                            assignmentId={assignmentId}
                            isEnrolled={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {index < classroomsAvailableToEnroll.length - 1 && (
                  <Separator className="mt-6" />
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
