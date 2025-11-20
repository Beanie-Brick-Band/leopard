"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

export default function Page() {
  return (
    <main>
      <Unauthenticated>Logged out</Unauthenticated>
      <Authenticated>Logged in</Authenticated>
      <AuthLoading>Loading...</AuthLoading>
    </main>
  );
}
