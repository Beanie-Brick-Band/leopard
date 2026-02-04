"use client";

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

import { Editor } from "~/components/editor";
import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";

function Content({ classroomId }: { classroomId: Id<"classrooms"> }) {
  const router = useRouter();
  const createAssignment = useMutation(
    api.web.teacherAssignments.createAssignment,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    dueDate: "",
    templateId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const assignmentId = await createAssignment({
        classroomId,
        name: formData.name,
        description: formData.description,
        dueDate: formData.dueDate,
        templateId: formData.templateId || undefined,
      });

      toast.success("Assignment created successfully!");
      router.push(`/teacher/classroom/${classroomId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create assignment",
      );
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-6 py-8">
      <div>
        <Link
          href={`/teacher/classroom/${classroomId}`}
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Classroom
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Assignment</CardTitle>
          <CardDescription>
            Set up a new assignment for your students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Assignment Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Python Basics - Variables and Types"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Editor
                content={formData.description}
                onChange={(content) =>
                  setFormData({ ...formData, description: content })
                }
                placeholder="Describe the assignment objectives and requirements... You can paste markdown!"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                required
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
              />
              <p className="text-muted-foreground text-xs">
                Students will be able to submit until this date
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateId">
                Template ID{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="templateId"
                value={formData.templateId}
                onChange={(e) =>
                  setFormData({ ...formData, templateId: e.target.value })
                }
                placeholder="e.g., python-basic, c-datastructures, java-project"
              />
              <p className="text-muted-foreground text-xs">
                Specify a Coder template ID for the workspace environment
              </p>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Assignment"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
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
        <div className="container mx-auto max-w-2xl py-8">
          <Card>
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                You need to sign in to create assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>

      <Authenticated>
        <Content classroomId={classroomId} />
      </Authenticated>

      <AuthLoading>
        <div className="container mx-auto flex min-h-[400px] items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AuthLoading>
    </main>
  );
}
