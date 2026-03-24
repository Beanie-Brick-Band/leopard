"use client";

import type { FormEvent } from "react";
import { use, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction, useMutation } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import type { Id } from "@package/backend/convex/_generated/dataModel";
import type { DateRange } from "@package/ui/calendar";
import { api } from "@package/backend/convex/_generated/api";
import { Button } from "@package/ui/button";
import { Calendar } from "@package/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@package/ui/card";
import { Input } from "@package/ui/input";
import { Label } from "@package/ui/label";
import { Spinner } from "@package/ui/spinner";

import type { StarterCodeUploaderHandle } from "~/components/starter-code-uploader";
import { Editor } from "~/components/editor";
import { StarterCodeUploader } from "~/components/starter-code-uploader";
import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";

function NewAssignmentForm({ classroomId }: { classroomId: Id<"classrooms"> }) {
  const router = useRouter();
  const createAssignment = useMutation(
    api.web.teacherAssignments.createAssignment,
  );
  const getUploadUrl = useAction(
    api.web.teacherAssignmentActions.generateStarterCodeUploadUrl,
  );

  const uploaderRef = useRef<StarterCodeUploaderHandle>(null);
  const storageKeyRef = useRef<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange());

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (!dateRange.from || !dateRange.to) {
        throw new Error("Please select a date range");
      }
      if (!name.trim()) {
        throw new Error("Assignment name is required");
      }

      const releaseDateVal = new Date(dateRange.from);
      const dueDateVal = new Date(dateRange.to);

      if (dueDateVal.getTime() <= releaseDateVal.getTime()) {
        throw new Error("Due date must be after release date");
      }

      // Upload starter code first (if any), before creating the assignment
      if (uploaderRef.current?.hasFiles()) {
        storageKeyRef.current = null;
        await uploaderRef.current.upload();
      }

      const assignmentId = await createAssignment({
        classroomId,
        name: name.trim(),
        description: description.trim() || undefined,
        releaseDate: releaseDateVal.getTime(),
        dueDate: dueDateVal.getTime(),
        starterCodeStorageKey: storageKeyRef.current ?? undefined,
      });

      toast.success(
        storageKeyRef.current
          ? "Assignment created with starter code"
          : "Assignment created",
      );

      router.push(
        `/teacher/classroom/${classroomId}/assignment/${assignmentId}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create assignment",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-6">
      <Link
        href={`/teacher/classroom/${classroomId}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Classroom
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create Assignment</CardTitle>
          <CardDescription>
            Set up assignment details and instructions for students.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="assignment-name">Name</Label>
              <Input
                id="assignment-name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Week 3 - Sorting Algorithms"
              />
            </div>
            <Label aria-label="availability-period">Availability Period</Label>
            <Calendar
              className="w-full"
              mode="range"
              defaultMonth={dateRange.from}
              selected={dateRange}
              onSelect={(newDateRange) =>
                setDateRange(updateDateRange(dateRange, newDateRange))
              }
              numberOfMonths={2}
              showOutsideDays={false}
              required
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="release-time">
                  Availability Start Time / Release Time
                </Label>
                <Input
                  id="release-time"
                  type="time"
                  required
                  // can't figure out a proper way to colour this. Colouring the text
                  // and background don't work, so we'll settle with inverting the colour
                  className="[&::-webkit-calendar-picker-indicator]:invert"
                  value={formatTime(dateRange.from)}
                  onChange={(event) =>
                    setDateRange(
                      updateDateRangeTime(
                        dateRange,
                        "from",
                        event.target.value,
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due-time">
                  Availability End Time / Due Time
                </Label>
                <Input
                  id="due-time"
                  type="time"
                  required
                  // can't figure out a proper way to colour this. Colouring the text
                  // and background don't work, so we'll settle with inverting the colour
                  className="[&::-webkit-calendar-picker-indicator]:invert"
                  value={formatTime(dateRange.to)}
                  onChange={(event) =>
                    setDateRange(
                      updateDateRangeTime(dateRange, "to", event.target.value),
                    )
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignment-description">Description</Label>
              <Editor
                content={description}
                onChange={setDescription}
                placeholder="Describe the assignment objectives and requirements..."
              />
            </div>
            <div className="space-y-2">
              <Label>Starter Code (optional)</Label>
              <StarterCodeUploader
                ref={uploaderRef}
                autoProceed={false}
                getUploadUrl={() => getUploadUrl({ classroomId })}
                onUploadSuccess={(storageKey) => {
                  storageKeyRef.current = storageKey;
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Assignment"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/teacher/classroom/${classroomId}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const classroomId = id as Id<"classrooms">;

  return (
    <main>
      <Unauthenticated>
        <div className="container mx-auto max-w-xl p-6">
          <Card>
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>Sign in to create assignments.</CardDescription>
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
        <NewAssignmentForm classroomId={classroomId} />
      </Authenticated>
      <AuthLoading>
        <div className="flex min-h-[300px] items-center justify-center">
          <Spinner />
        </div>
      </AuthLoading>
    </main>
  );
}

function formatTime(date: Date | undefined) {
  if (!date) return "";
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function defaultDateRange() {
  const from = new Date();
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function updateDateRange(
  dateRange: DateRange,
  newDateRange?: DateRange,
): DateRange {
  if (!newDateRange) {
    return dateRange;
  }

  let newFrom = undefined;
  if (newDateRange.from) {
    newFrom = new Date(newDateRange.from);
    newFrom.setHours(
      dateRange.from?.getHours() ?? 0,
      dateRange.from?.getMinutes() ?? 0,
    );
  }

  let newTo = undefined;
  if (newDateRange.to) {
    newTo = new Date(newDateRange.to);
    newTo.setHours(
      dateRange.to?.getHours() ?? 0,
      dateRange.to?.getMinutes() ?? 0,
      59,
      999,
    );
  }

  return { from: newFrom, to: newTo };
}

function updateDateRangeTime(
  dateRange: DateRange | undefined,
  field: "from" | "to",
  time: string,
) {
  if (!dateRange) return defaultDateRange();
  const currentDate = dateRange[field];
  if (!currentDate) return dateRange;
  const [hours, minutes] = time.split(":").map(Number) as [number, number];
  const newDate = new Date(currentDate);
  newDate.setHours(
    hours,
    minutes,
    field === "to" ? 59 : 0,
    field === "to" ? 999 : 0,
  );
  console.log(newDate);
  return { ...dateRange, [field]: newDate };
}
