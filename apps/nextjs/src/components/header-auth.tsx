"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@package/ui/button";

import { Authenticated, Unauthenticated } from "~/lib/auth";

function HeaderAuth() {
  const pathname = usePathname();
  const showDashboardLink = pathname === "/";

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
        {showDashboardLink ? (
          <Button
            asChild
            className="shadow-primary/20 border border-black/10 shadow-sm dark:border-white/10"
          >
            <Link href="/app">Open Dashboard</Link>
          </Button>
        ) : null}
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
