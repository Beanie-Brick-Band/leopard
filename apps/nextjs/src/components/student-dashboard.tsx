"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudentDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/student");
  }, [router]);

  return (
    <div className="container mx-auto p-6">
      <p className="text-muted-foreground text-sm">
        Opening student dashboard...
      </p>
    </div>
  );
}
