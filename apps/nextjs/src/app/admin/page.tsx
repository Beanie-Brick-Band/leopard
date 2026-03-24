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

import AdminUserManagement from "~/components/admin-user-management";
import { fetchAuthQuery, isAuthenticated } from "~/lib/auth-server";

export default async function AdminPage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return (
      <main className="container mx-auto max-w-xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Sign in to open the admin user management page.
            </CardDescription>
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

  const role = await fetchAuthQuery(api.web.user.getCurrentUserRole, {});

  if (role !== "admin") {
    return (
      <main className="container mx-auto max-w-xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>
              Only admins can manage user roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/app">Back to App</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main>
      <AdminUserManagement />
    </main>
  );
}
