"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";

import type { Id } from "@package/backend/convex/_generated/dataModel";
import { api } from "@package/backend/convex/_generated/api";

import { Authenticated, useConvexAuth } from "~/lib/auth";
import HeaderAuth from "./header-auth";

interface BreadcrumbItem {
  href: string;
  type: "static" | "classroom" | "assignment";
  label?: string;
  id?: string;
}

function isAssignmentCrumbWithId(
  item: BreadcrumbItem,
): item is BreadcrumbItem & { type: "assignment"; id: string } {
  return item.type === "assignment" && typeof item.id === "string";
}

function getRole(pathname: string) {
  const [firstSegment] = pathname.split("/").filter(Boolean);

  if (
    firstSegment === "teacher" ||
    firstSegment === "student" ||
    firstSegment === "app"
  ) {
    return firstSegment;
  }

  return null;
}

function buildBreadcrumbTrail(pathname: string): BreadcrumbItem[] {
  // ensures that during sign in/sign out no breadcrumb is shown
  if (pathname === "/" || pathname.startsWith("/auth")) {
    return [];
  }

  const segments = pathname.split("/").filter(Boolean);
  const role = getRole(pathname);

  if (!role) {
    return [];
  }

  const trail: BreadcrumbItem[] = [
    {
      href: `/${role}`,
      type: "static",
      label: "Dashboard",
    },
  ];

  const classroomIndex = segments.indexOf("classroom");
  if (classroomIndex >= 0) {
    const classroomSegment = segments[classroomIndex + 1];

    if (classroomSegment) {
      trail.push({
        href: `/${segments.slice(0, classroomIndex + 2).join("/")}`,
        ...(classroomSegment === "new"
          ? { type: "static" as const, label: "New Classroom" }
          : { type: "classroom" as const, id: classroomSegment }),
      });
      // stop trail as no further breadcrumb
      if (classroomSegment === "new") {
        return trail;
      }
    }
  }

  const assignmentIndex = segments.indexOf("assignment");
  if (assignmentIndex >= 0) {
    const assignmentSegment = segments[assignmentIndex + 1];

    if (assignmentSegment) {
      trail.push({
        href: `/${segments.slice(0, assignmentIndex + 2).join("/")}`,
        ...(assignmentSegment === "new"
          ? { type: "static" as const, label: "Create Assignment" }
          : { type: "assignment" as const, id: assignmentSegment }),
      });
      // stop trail as no further breadcrumb
      if (assignmentSegment === "new") {
        return trail;
      }
    }
  }

  const reviewIndex = segments.indexOf("review");
  if (reviewIndex >= 0 && segments[reviewIndex + 1]) {
    trail.push({
      href: `/${segments.slice(0, reviewIndex + 2).join("/")}`,
      type: "static",
      label: "Review",
    });
  }

  return trail;
}

function resolveLabel(
  item: BreadcrumbItem,
  assignmentNameById: Map<string, string>,
  classroomNameById: Map<string, string>,
) {
  if (item.type === "assignment" && item.id) {
    return assignmentNameById.get(item.id) ?? "...";
  }

  if (item.type === "classroom" && item.id) {
    return classroomNameById.get(item.id) ?? "...";
  }

  // for static items
  return item.label ?? "";
}

function useHeaderBreadcrumb() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useConvexAuth();

  const breadcrumbTrail = useMemo(
    () => buildBreadcrumbTrail(pathname),
    [pathname],
  );
  const currentRole = getRole(pathname);
  const assignmentIds = useMemo(() => {
    return [
      ...new Set(
        breadcrumbTrail.filter(isAssignmentCrumbWithId).map((item) => item.id),
      ),
    ];
  }, [breadcrumbTrail]);

  const canRunProtectedQueries = isAuthenticated && !isLoading;

  const assignments = useQuery(
    api.web.assignment.getByIds,
    canRunProtectedQueries && assignmentIds.length > 0
      ? { ids: assignmentIds as Id<"assignments">[] }
      : "skip",
  );
  // skipping if role doesnt have neccesary auth
  const teacherQueryArgs =
    canRunProtectedQueries && currentRole === "teacher" ? {} : "skip";
  const studentQueryArgs =
    canRunProtectedQueries && currentRole === "student" ? {} : "skip";

  const teacherClassrooms = useQuery(
    api.web.teacher.getMyClassrooms,
    teacherQueryArgs,
  );
  const studentEnrolledClassrooms = useQuery(
    api.web.classroom.getEnrolled,
    studentQueryArgs,
  );
  const studentAvailableClassrooms = useQuery(
    api.web.classroom.getAvailableToEnroll,
    studentQueryArgs,
  );

  const assignmentNameById = useMemo(
    () =>
      new Map(
        (assignments ?? []).map((assignment) => [
          assignment._id,
          assignment.name,
        ]),
      ),
    [assignments],
  );

  const classroomNameById = useMemo(() => {
    const classrooms = (
      currentRole === "teacher"
        ? (teacherClassrooms ?? [])
        : [
            ...(studentEnrolledClassrooms ?? []),
            ...(studentAvailableClassrooms ?? []),
          ]
    ).filter(
      (classroom): classroom is NonNullable<typeof classroom> =>
        classroom !== null,
    );

    return new Map<string, string>(
      classrooms.map((classroom) => [classroom._id, classroom.className]),
    );
  }, [
    currentRole,
    studentAvailableClassrooms,
    studentEnrolledClassrooms,
    teacherClassrooms,
  ]);

  const displayedBreadcrumbTrail = useMemo(
    () =>
      breadcrumbTrail.map((item) => ({
        href: item.href,
        label: resolveLabel(item, assignmentNameById, classroomNameById),
      })),
    [assignmentNameById, breadcrumbTrail, classroomNameById],
  );

  return {
    pathname,
    breadcrumbTrail: displayedBreadcrumbTrail,
  };
}

function Header() {
  const { pathname, breadcrumbTrail } = useHeaderBreadcrumb();

  if (pathname === "/") {
    return null;
  }

  return (
    <header className="flex h-12 w-screen items-center justify-between border-b px-4">
      <div className="flex items-center gap-6">
        <h1 className="h-full border-r py-2 pr-4 font-semibold">
          <Link href="/">Leopard IDE</Link>
        </h1>
        <Authenticated>
          <nav
            className="text-muted-foreground flex items-center gap-2 text-base"
            aria-label="Breadcrumb"
          >
            {breadcrumbTrail.map((item, index) => {
              const isCurrentPage = index === breadcrumbTrail.length - 1;

              return (
                <div key={item.href} className="flex items-center gap-2">
                  {isCurrentPage ? (
                    <Link
                      href={item.href}
                      className="text-foreground hover:text-muted-foreground underline decoration-blue-500 decoration-2 underline-offset-4 hover:decoration-blue-600"
                      aria-current="page"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <Link
                      href={item.href}
                      className="hover:text-muted-foreground text-foreground underline decoration-blue-500 decoration-2 underline-offset-4 hover:decoration-blue-600"
                    >
                      {item.label}
                    </Link>
                  )}
                  {!isCurrentPage ? <span aria-hidden="true">/</span> : null}
                </div>
              );
            })}
          </nav>
        </Authenticated>
      </div>
      <HeaderAuth />
    </header>
  );
}

export default Header;
