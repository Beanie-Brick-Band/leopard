"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight, Plus } from "lucide-react";

import { api } from "@package/backend/convex/_generated/api";
import { Button } from "@package/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@package/ui/card";
import { Separator } from "@package/ui/separator";
import { Spinner } from "@package/ui/spinner";

import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";

function TeacherDashboard() {
  const classrooms = useQuery(api.web.teacher.getMyClassrooms);
  const profile = useQuery(api.web.userProfile.getProfile);

  if (classrooms === undefined || profile === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Check if user has teacher role
  if (!profile || profile.role !== "teacher") {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need to be a teacher to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              If you believe this is an error, please contact your
              administrator.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline">
              <Link href="/student">Go to Student Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Classrooms</h1>
          <p className="text-muted-foreground mt-2">
            Manage your courses and assignments
          </p>
        </div>
        <Button asChild>
          <Link href="/teacher/classroom/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Classroom
          </Link>
        </Button>
      </div>

      <Separator className="mb-8" />

      {classrooms.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[300px] flex-col items-center justify-center py-8">
            <p className="text-muted-foreground mb-4 text-center">
              You haven't created any classrooms yet.
              <br />
              Get started by creating your first classroom!
            </p>
            <Button asChild>
              <Link href="/teacher/classroom/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Classroom
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => (
            <Link
              key={classroom._id}
              href={`/teacher/classroom/${classroom._id}`}
            >
              <Card className="hover:border-primary h-full transition-all hover:shadow-md">
                <CardHeader>
                  <CardTitle className="line-clamp-1">
                    {classroom.className}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {classroom.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-muted-foreground text-sm">
                    Created:{" "}
                    {new Date(classroom.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" className="w-full">
                    Manage Classroom
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeacherPage() {
  return (
    <>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Spinner />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="container mx-auto max-w-4xl py-8">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please sign in to access the teacher dashboard.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild>
                <Link href="/auth/sign-in">Sign In</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Unauthenticated>
      <Authenticated>
        <TeacherDashboard />
      </Authenticated>
    </>
  );
}
