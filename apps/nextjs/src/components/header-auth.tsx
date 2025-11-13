"use client";

import Link from "next/link";

import { UserButton } from "@package/ui";
import { Button } from "@package/ui/button";

import { authClient } from "~/lib/auth-client";

function HeaderAuth() {
  const { data: session } = authClient.useSession();

  if (!session?.user) {
    return (
      <div>
        <Button>
          <Link href="/auth/login">Log In</Link>
        </Button>
      </div>
    );
  }

  return <UserButton size="icon" />;
}

export default HeaderAuth;
