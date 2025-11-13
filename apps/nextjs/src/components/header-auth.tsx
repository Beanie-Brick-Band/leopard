"use client";

import Link from "next/link";

import { Button } from "@package/ui/button";

import { authClient } from "~/lib/auth-client";

function HeaderAuth() {
  const { data: session } = authClient.useSession();

  if (!session?.user) {
    return (
      <div>
        <Button>
          <Link href="/login">Log In</Link>
        </Button>
      </div>
    );
  }

  return <div>Logged IN</div>;
}

export default HeaderAuth;
