"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { authClient } from "~/lib/auth-client";

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleSignOut() {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/");
          },
          onError: (error) => {
            toast.error(error.error.message);
            router.push("/");
          },
        },
      });
    }

    void handleSignOut();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground text-lg">Signing out...</p>
      </div>
    </div>
  );
}
