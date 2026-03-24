import Link from "next/link";

import { api } from "@package/backend/convex/_generated/api";
import { Button } from "@package/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@package/ui/card";

import StudentDashboard from "~/components/student-dashboard";
import TeacherDashboard from "~/components/teacher-dashboard";
import {
  fetchAuthMutation,
  fetchAuthQuery,
  isAuthenticated,
} from "~/lib/auth-server";

async function getDashboardRole() {
  return (
    (await fetchAuthQuery(api.web.user.getCurrentUserRole, {})) ?? "student"
  );
}

export default async function Page() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return (
      <main className="container mx-auto max-w-xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Sign in to open your dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/auth/sign-in">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  await fetchAuthMutation(api.web.user.ensureCurrentUserRole, {});
  const role = await getDashboardRole();
  const isInstructor = role === "teacher" || role === "admin";

  return (
    <main>
      {isInstructor ? (
        <TeacherDashboard isAdmin={role === "admin"} />
      ) : (
        <StudentDashboard />
      )}
    </main>
  );
}
