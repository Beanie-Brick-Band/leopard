"use client";

import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "@package/backend/convex/_generated/api";

import { Authenticated, Unauthenticated } from "~/lib/auth";
import { getDashboardRoute } from "~/lib/role-utils";
import HeaderAuth from "./header-auth";

function Header() {
  const profile = useQuery(api.web.userProfile.getProfile);
  const role = profile?.role ?? null;
  const dashboardRoute = getDashboardRoute(role);

  return (
    <header className="flex h-12 w-screen items-center justify-between border-b px-4 py-2">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-heading text-xl font-bold">
          Leopard
        </Link>
        <Authenticated>
          <nav className="flex items-center gap-4">
            <Link
              href={dashboardRoute}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Dashboard
            </Link>
            {role === "teacher" && (
              <Link
                href="/teacher"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                My Classes
              </Link>
            )}
            {role === "student" && (
              <Link
                href="/student"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                My Classes
              </Link>
            )}
          </nav>
        </Authenticated>
      </div>
      <HeaderAuth />
    </header>
  );
}

export default Header;
