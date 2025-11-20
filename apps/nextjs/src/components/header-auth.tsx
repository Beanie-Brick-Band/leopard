"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated } from "convex/react";

import { Button } from "@package/ui/button";

function HeaderAuth() {
  return (
    <div className="flex gap-2">
      <Authenticated>
        <Link href="/auth/sign-out" passHref>
          <Button variant="secondary">Sign Out</Button>
        </Link>
        <Link href="/app" passHref>
          <Button>Go to App</Button>
        </Link>
      </Authenticated>
      <Unauthenticated>
        <Link href="/auth/sign-in" passHref>
          <Button>Sign In</Button>
        </Link>
      </Unauthenticated>
    </div>
  );
}

export default HeaderAuth;
