"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

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

type UserRole = "admin" | "student" | "teacher";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  student: "Student",
  teacher: "Teacher",
};

function roleBadgeClassName(role: UserRole) {
  switch (role) {
    case "admin":
      return "bg-orange-100 text-orange-950 dark:bg-orange-500/20 dark:text-orange-100";
    case "teacher":
      return "bg-blue-100 text-blue-950 dark:bg-blue-500/20 dark:text-blue-100";
    case "student":
      return "bg-muted text-muted-foreground";
  }
}

export default function AdminUserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingChange, setPendingChange] = useState<{
    role: UserRole;
    userId: string;
  } | null>(null);
  const deferredSearchTerm = useDeferredValue(searchTerm.trim());
  const users = useQuery(api.web.user.searchUsers, {
    searchTerm: deferredSearchTerm,
  });
  const updateUserRole = useMutation(api.web.user.updateUserRole);

  const handleRoleChange = async (
    user: {
      displayName: string;
      role: UserRole;
      userId: string;
    },
    role: UserRole,
  ) => {
    setPendingChange({ role, userId: user.userId });

    try {
      await updateUserRole({
        role,
        userId: user.userId,
      });
      toast.success(
        `${user.displayName} is now a ${roleLabels[role].toLowerCase()}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update user role",
      );
    } finally {
      setPendingChange(null);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div className="space-y-2">
        <Link href="/app" className="text-muted-foreground text-sm underline">
          Back to App
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Admin User Roles</h1>
            <p className="text-muted-foreground text-sm">
              Search Leopard users and update who can teach or administer the
              app.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Users</CardTitle>
          <CardDescription>
            Search by name, email, username, role, or internal user ID.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="user-search">Find a user</Label>
          <Input
            id="user-search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="alice@example.com"
          />
        </CardContent>
      </Card>

      {users === undefined ? (
        <div className="flex min-h-[280px] items-center justify-center">
          <Spinner />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Users Found</CardTitle>
            <CardDescription>
              Try a different search term or wait for more users to sign in.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.userId}>
              <CardContent className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">
                      {user.displayName}
                    </h2>
                    {user.isCurrentUser ? (
                      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                        You
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClassName(
                        user.role,
                      )}`}
                    >
                      {roleLabels[user.role]}
                    </span>
                  </div>
                  <div className="text-muted-foreground space-y-1 text-sm">
                    {user.email ? <p>{user.email}</p> : null}
                    {user.username || user.displayUsername ? (
                      <p>@{user.displayUsername ?? user.username}</p>
                    ) : null}
                    <p className="font-mono text-xs">{user.userId}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(["student", "teacher", "admin"] as const).map((role) => {
                    const isPending =
                      pendingChange?.userId === user.userId &&
                      pendingChange.role === role;
                    const isDisabled =
                      isPending ||
                      user.role === role ||
                      (user.isCurrentUser && role !== "admin");

                    return (
                      <Button
                        key={role}
                        size="sm"
                        variant={user.role === role ? "default" : "outline"}
                        disabled={isDisabled}
                        onClick={() => handleRoleChange(user, role)}
                      >
                        {isPending ? "Saving..." : roleLabels[role]}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
