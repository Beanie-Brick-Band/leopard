"use client";

import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "@package/backend/convex/_generated/api";
import { Button } from "@package/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@package/ui/card";
import { Spinner } from "@package/ui/spinner";

export default function TeacherDashboard() {
  const classrooms = useQuery(api.web.teacher.getMyClassrooms);

  if (classrooms === undefined) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Manage classrooms and assignments
          </p>
        </div>
        <Button asChild>
          <Link href="/teacher/classroom/new">Create Classroom</Link>
        </Button>
      </div>

      {classrooms.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Classrooms Yet</CardTitle>
            <CardDescription>
              Start by creating your first classroom.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/teacher/classroom/new">Create Classroom</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classrooms.map((classroom) => (
            <Link
              key={classroom._id}
              href={`/teacher/classroom/${classroom._id}`}
            >
              <Card className="h-full transition-colors hover:border-primary">
                <CardHeader>
                  <CardTitle>{classroom.className}</CardTitle>
                  <CardDescription>
                    Open classroom and manage assignments.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {classroom.assignments.length} assignment
                  {classroom.assignments.length === 1 ? "" : "s"} • Created{" "}
                  {new Date(classroom._creationTime).toLocaleDateString()}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
