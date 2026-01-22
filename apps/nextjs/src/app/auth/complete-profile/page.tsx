"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Spinner } from "@package/ui/spinner";

import { Authenticated, AuthLoading, Unauthenticated } from "~/lib/auth";
import { getDashboardRoute } from "~/lib/role-utils";

function CompleteProfileContent() {
  const router = useRouter();
  const profile = useQuery(api.web.userProfile.getProfile);
  const createProfile = useMutation(api.web.userProfile.createProfile);
  const [selectedRole, setSelectedRole] = useState<
    "student" | "teacher" | null
  >("student");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user already has a profile, redirect them
  useEffect(() => {
    if (profile) {
      const route = getDashboardRoute(profile.role);
      router.push(route);
    }
  }, [profile, router]);

  if (profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!selectedRole) {
      toast.error("Please select a role");
      return;
    }

    setIsSubmitting(true);
    try {
      await createProfile({ role: selectedRole });
      toast.success("Profile created successfully!");
      const route = getDashboardRoute(selectedRole);
      router.push(route);
    } catch (error) {
      console.error("Profile creation error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create profile",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>Please select your role to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="mb-3 block text-sm font-medium">I am a...</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSelectedRole("student")}
                disabled={isSubmitting}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                  selectedRole === "student"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                } ${isSubmitting ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
                <span className="font-medium">Student</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("teacher")}
                disabled={isSubmitting}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                  selectedRole === "teacher"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                } ${isSubmitting ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                  <path d="M8 14h.01" />
                  <path d="M12 14h.01" />
                  <path d="M16 14h.01" />
                  <path d="M8 18h.01" />
                  <path d="M12 18h.01" />
                  <path d="M16 18h.01" />
                </svg>
                <span className="font-medium">Teacher</span>
              </button>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selectedRole || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Creating Profile..." : "Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <main>
      <Unauthenticated>
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please sign in to complete your profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <a href="/auth/sign-in">Sign In</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
      <Authenticated>
        <CompleteProfileContent />
      </Authenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Spinner />
        </div>
      </AuthLoading>
    </main>
  );
}
