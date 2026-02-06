"use client";

import type { FormEvent } from "react";
import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { ArrowLeft } from "lucide-react";
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
import { Spinner } from "@package/ui/spinner";

import { Editor } from "~/components/editor";
import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";

function formatDateForInput(timestamp: number) {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function NewAssignmentForm({ classroomId }: { classroomId: Id<"classrooms"> }) {
  const router = useRouter();
  const createAssignment = useMutation(
    api.web.teacherAssignments.createAssignment,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [releaseDate, setReleaseDate] = useState(
    formatDateForInput(Date.now()),
  );
  const [dueDate, setDueDate] = useState(
    formatDateForInput(Date.now() + 24 * 60 * 60 * 1000),
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

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

      const assignmentId = await createAssignment({
        classroomId,
        name: name.trim(),
        description: description.trim() || undefined,
        releaseDate: parsedReleaseDate,
        dueDate: parsedDueDate,
      });

      toast.success("Assignment created");
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

            <div className="space-y-2">
              <Label htmlFor="assignment-description">Description</Label>
              <Editor
                content={description}
                onChange={setDescription}
                placeholder="Describe the assignment objectives and requirements..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="release-date">Release Date</Label>
                <Input
                  id="release-date"
                  type="datetime-local"
                  required
                  value={releaseDate}
                  onChange={(event) => setReleaseDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="datetime-local"
                  required
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>
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
