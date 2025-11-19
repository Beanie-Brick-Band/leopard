"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthUIProvider } from "@package/ui";

import { authClient } from "~/lib/auth-client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={(path) => router.push(path)}
      replace={(path) => router.replace(path)}
      onSessionChange={() => router.refresh()}
      Link={Link}
    >
      {children}
    </AuthUIProvider>
  );
}
