"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";

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

import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";

function getClassroomSummary(metadata: string) {
  try {
    const parsed = JSON.parse(metadata) as { description?: unknown };
    if (typeof parsed.description === "string" && parsed.description.trim()) {
      return parsed.description;
    }
  } catch {
    // keep fallback
  }
  return "Open classroom to view assignments.";
}

function Content() {
  const enrolledClassrooms = useQuery(api.web.classroom.getEnrolled);
  const availableClassrooms = useQuery(api.web.classroom.getAvailableToEnroll);

  if (enrolledClassrooms === undefined || availableClassrooms === undefined) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">My Classes</h1>
        <p className="text-muted-foreground mt-1">
          View assignments and launch your coding workspaces.
        </p>
      </div>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Enrolled Classes</h2>
        {enrolledClassrooms.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enrolledClassrooms
              .filter(
                (classroom): classroom is NonNullable<typeof classroom> =>
                  classroom !== null,
              )
              .map((classroom) => (
                <Link
                  key={classroom._id}
                  href={`/student/classroom/${classroom._id}`}
                >
                  <Card className="hover:border-primary h-full transition-all hover:shadow-sm">
                    <CardHeader>
                      <CardTitle>{classroom.className}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {getClassroomSummary(classroom.metadata)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-muted-foreground flex items-center justify-between text-sm">
                      <span>{classroom.assignments.length} assignments</span>
                      <span className="inline-flex items-center gap-1">
                        Open
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-muted-foreground py-10 text-center text-sm">
              You are not enrolled in any classes yet.
            </CardContent>
          </Card>
        )}
      </section>

      {availableClassrooms.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Available Classes</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableClassrooms.map((classroom) => (
              <Card key={classroom._id}>
                <CardHeader>
                  <CardTitle>{classroom.className}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {getClassroomSummary(classroom.metadata)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full" size="sm">
                    <Link href={`/student/classroom/${classroom._id}`}>
                      View Class
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <main>
      <Unauthenticated>
        <div className="container mx-auto max-w-xl p-6">
          <Card>
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>Sign in to view your classes.</CardDescription>
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
        <Content />
      </Authenticated>
      <AuthLoading>
        <div className="flex min-h-[300px] items-center justify-center">
          <Spinner />
        </div>
      </AuthLoading>
    </main>
  );
}
