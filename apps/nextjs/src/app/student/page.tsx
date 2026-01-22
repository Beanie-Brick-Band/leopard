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

import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";

function Content() {
  const enrolledClassrooms = useQuery(api.web.classroom.getEnrolled);
  const availableClassrooms = useQuery(api.web.classroom.getAvailableToEnroll);

  return (
    <div className="container mx-auto space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Classes</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your enrolled classes
          </p>
        </div>
      </div>

      <Separator />

      {/* Enrolled Classrooms */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Enrolled Classes</h2>
        {enrolledClassrooms && enrolledClassrooms.length > 0 ? (
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
                  <Card className="hover:border-primary transition-all hover:shadow-md">
                    <CardHeader>
                      <CardTitle>{classroom.className}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {classroom.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-muted-foreground flex items-center text-sm">
                        View assignments
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                You are not enrolled in any classes yet.
              </p>
              <p className="text-muted-foreground text-sm">
                Browse available classes below to enroll.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Available Classrooms */}
      {availableClassrooms && availableClassrooms.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Available Classes</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableClassrooms.map((classroom) => (
              <Card key={classroom._id}>
                <CardHeader>
                  <CardTitle>{classroom.className}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {classroom.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/student/classroom/${classroom._id}`}>
                    <Button className="w-full" size="sm">
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <main>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please sign in to view your classes.
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
        <Content />
      </Authenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AuthLoading>
    </main>
  );
}
