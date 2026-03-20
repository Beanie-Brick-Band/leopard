"use client";

import Link from "next/link";

import { Button } from "@package/ui/button";

import { Authenticated, Unauthenticated } from "~/lib/auth";

function HeaderAuth() {
  return (
    <div className="flex gap-2">
      <Authenticated>
        <Button
          asChild
          variant="secondary"
          className="border border-black/10 shadow-sm dark:border-white/10"
        >
          <Link href="/auth/sign-out">Sign Out</Link>
        </Button>
        <Button
          asChild
          className="shadow-primary/20 border border-black/10 shadow-sm dark:border-white/10"
        >
          <Link href="/app">Go to App</Link>
        </Button>
      </Authenticated>
      <Unauthenticated>
        <Button
          asChild
          className="shadow-primary/20 border border-black/10 shadow-sm dark:border-white/10"
        >
          <Link href="/auth/sign-in">Sign In</Link>
        </Button>
      </Unauthenticated>
    </div>
  );
}

export default HeaderAuth;
