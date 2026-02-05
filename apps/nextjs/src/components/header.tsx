"use client";

import Link from "next/link";

import { Authenticated } from "~/lib/auth";
import HeaderAuth from "./header-auth";

function Header() {
  return (
    <header className="flex h-12 w-screen items-center justify-between border-b px-4 py-2">
      <div className="flex items-center gap-6">
        <h1 className="font-semibold">
          <Link href="/">Leopard IDE</Link>
        </h1>
        <Authenticated>
          <nav className="flex items-center gap-3 text-sm text-muted-foreground">
            <Link href="/app" className="hover:text-foreground">
              Dashboard
            </Link>
          </nav>
        </Authenticated>
      </div>
      <HeaderAuth />
    </header>
  );
}

export default Header;
