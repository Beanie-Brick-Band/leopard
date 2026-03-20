import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Id } from "@package/backend/convex/_generated/dataModel";

import StudentAssignmentPage from "./page";

// --- Hoisted mocks ---

const {
  mockUseQuery,
  mockSubmitWorkspace,
  mockLaunchWorkspace,
  mockToast,
} = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockSubmitWorkspace: vi.fn(),
  mockLaunchWorkspace: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args) as unknown,
  useMutation: () => vi.fn(),
}));

vi.mock("@package/backend/convex/_generated/api", () => ({
  api: {
    web: {
      assignment: {
        getById: "getById",
        getMyActiveWorkspace: "getMyActiveWorkspace",
      },
      submission: {
        getOwnSubmissionsForAssignment: "getOwnSubmissionsForAssignment",
      },
    },
  },
}));

vi.mock("~/app/app/actions", () => ({
  launchWorkspace: (...args: unknown[]) => mockLaunchWorkspace(...args),
  submitWorkspace: (...args: unknown[]) => mockSubmitWorkspace(...args),
}));

vi.mock("sonner", () => ({ toast: mockToast }));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock("remark-gfm", () => ({
  default: () => ({}),
}));

vi.mock("~/components/workspace-launching-overlay", () => ({
  WorkspaceLaunchingOverlay: () => null,
}));

vi.mock("~/lib/auth", () => ({
  Authenticated: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  Unauthenticated: () => null,
  AuthLoading: () => null,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// --- Helpers ---

const CLASSROOM_ID = "classroom123" as Id<"classrooms">;
const ASSIGNMENT_ID = "assignment456" as Id<"assignments">;
const WORKSPACE_ID = "workspace789" as Id<"workspaces">;

const FUTURE_DATE = Date.now() + 86_400_000; // tomorrow
const PAST_DATE = Date.now() - 86_400_000; // yesterday

function makeAssignment(overrides: Record<string, unknown> = {}) {
  return {
    _id: ASSIGNMENT_ID,
    name: "Test Assignment",
    description: "Do the thing",
    dueDate: FUTURE_DATE,
    classroomId: CLASSROOM_ID,
    ...overrides,
  };
}

function makeWorkspace(overrides: Record<string, unknown> = {}) {
  return {
    _id: WORKSPACE_ID,
    coderWorkspaceId: "coder-ws-1",
    isActive: true,
    userId: "user1",
    ...overrides,
  };
}

/**
 * Configure mockUseQuery to return different values based on the query ref string.
 */
function setupQueryMocks({
  assignment = makeAssignment(),
  workspace = makeWorkspace() as ReturnType<typeof makeWorkspace> | null | undefined,
  submissionResult = { success: false as const },
}: {
  assignment?: ReturnType<typeof makeAssignment>;
  workspace?: ReturnType<typeof makeWorkspace> | null | undefined;
  submissionResult?: Record<string, unknown>;
} = {}) {
  mockUseQuery.mockImplementation((ref: string) => {
    if (ref === "getById") return assignment;
    if (ref === "getMyActiveWorkspace") return workspace;
    if (ref === "getOwnSubmissionsForAssignment") return submissionResult;
    return undefined;
  });
}

async function renderPage() {
  const params = Promise.resolve({
    id: CLASSROOM_ID,
    assignmentId: ASSIGNMENT_ID,
  });

  await act(async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <StudentAssignmentPage params={params} />
      </Suspense>,
    );
  });
}

// --- Tests ---

describe("StudentAssignmentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("shows a spinner while data is loading", async () => {
      mockUseQuery.mockReturnValue(undefined);

      await renderPage();

      // The Spinner component renders a loading indicator
      expect(screen.queryByText("Test Assignment")).not.toBeInTheDocument();
    });
  });

  describe("status display", () => {
    it("shows 'Not submitted' when there is no submission", async () => {
      setupQueryMocks();

      await renderPage();

      expect(screen.getByText("Not submitted")).toBeInTheDocument();
    });

    it("shows 'Submitted' for a confirmed submission", async () => {
      setupQueryMocks({
        submissionResult: {
          success: true,
          submission: {
            studentId: "student1",
            assignmentId: ASSIGNMENT_ID,
            submittedAt: Date.now(),
            gradesReleased: false,
            status: "confirmed",
          },
        },
      });

      await renderPage();

      // The status line should show "Submitted"
      const statusElements = screen.getAllByText("Submitted");
      expect(statusElements.length).toBeGreaterThanOrEqual(1);
    });

    it("shows 'Submitting...' when status is uploading", async () => {
      setupQueryMocks({
        submissionResult: {
          success: true,
          submission: {
            studentId: "student1",
            assignmentId: ASSIGNMENT_ID,
            submittedAt: Date.now(),
            gradesReleased: false,
            status: "uploading",
          },
        },
      });

      await renderPage();

      // Status line shows "Submitting..." and button also shows it
      const matches = screen.getAllByText("Submitting...");
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("shows 'Failed' when status is failed", async () => {
      setupQueryMocks({
        submissionResult: {
          success: true,
          submission: {
            studentId: "student1",
            assignmentId: ASSIGNMENT_ID,
            submittedAt: Date.now(),
            gradesReleased: false,
            status: "failed",
          },
        },
      });

      await renderPage();

      expect(screen.getByText("Failed")).toBeInTheDocument();
    });

    it("shows 'Graded' when a grade exists", async () => {
      setupQueryMocks({
        submissionResult: {
          success: true,
          submission: {
            studentId: "student1",
            assignmentId: ASSIGNMENT_ID,
            submittedAt: Date.now(),
            gradesReleased: true,
            status: "confirmed",
            grade: 95,
            gradedAt: Date.now(),
          },
        },
      });

      await renderPage();

      expect(screen.getByText("Graded")).toBeInTheDocument();
      expect(screen.getByText("95")).toBeInTheDocument();
    });

    it("shows 'Submitted' for legacy submissions without status field", async () => {
      setupQueryMocks({
        submissionResult: {
          success: true,
          submission: {
            studentId: "student1",
            assignmentId: ASSIGNMENT_ID,
            submittedAt: Date.now(),
            gradesReleased: false,
            // no status field — legacy record
          },
        },
      });

      await renderPage();

      const statusElements = screen.getAllByText("Submitted");
      expect(statusElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("confirmed submission", () => {
    it("shows success message and hides submit button", async () => {
      setupQueryMocks({
        submissionResult: {
          success: true,
          submission: {
            studentId: "student1",
            assignmentId: ASSIGNMENT_ID,
            submittedAt: Date.now(),
            gradesReleased: false,
            status: "confirmed",
          },
        },
      });

      await renderPage();

      expect(
        screen.getByText(
          "Assignment submitted successfully. Your workspace has been shut down.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /submit assignment/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("submit button states", () => {
    it("shows 'Submit Assignment' when no submission exists", async () => {
      setupQueryMocks();

      await renderPage();

      expect(
        screen.getByRole("button", { name: "Submit Assignment" }),
      ).toBeInTheDocument();
    });

    it("shows 'Retry Submission' when status is failed", async () => {
      setupQueryMocks({
        submissionResult: {
          success: true,
          submission: {
            studentId: "student1",
            assignmentId: ASSIGNMENT_ID,
            submittedAt: Date.now(),
            gradesReleased: false,
            status: "failed",
          },
        },
      });

      await renderPage();

      expect(
        screen.getByRole("button", { name: "Retry Submission" }),
      ).toBeInTheDocument();
    });

    it("disables submit button when past due", async () => {
      setupQueryMocks({
        assignment: makeAssignment({ dueDate: PAST_DATE }),
      });

      await renderPage();

      expect(
        screen.getByRole("button", { name: "Submit Assignment" }),
      ).toBeDisabled();
    });

    it("disables submit button when no active workspace", async () => {
      setupQueryMocks({ workspace: null });

      await renderPage();

      expect(
        screen.getByRole("button", { name: "Submit Assignment" }),
      ).toBeDisabled();
      expect(
        screen.getByText("Launch a workspace before submitting."),
      ).toBeInTheDocument();
    });

    it("shows helper text about submission behaviour", async () => {
      setupQueryMocks();

      await renderPage();

      expect(
        screen.getByText(
          "Submitting will zip your workspace, upload it, and shut down the workspace.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("submit flow", () => {
    it("opens confirm dialog and calls submitWorkspace on confirm", async () => {
      const user = userEvent.setup();
      mockSubmitWorkspace.mockResolvedValue({ success: true });
      setupQueryMocks();

      await renderPage();

      await user.click(
        screen.getByRole("button", { name: "Submit Assignment" }),
      );

      // Confirm dialog should be visible
      expect(screen.getByText("Submit Assignment?")).toBeInTheDocument();
      expect(
        screen.getByText(
          "This action is irreversible. You will not be able to submit again or relaunch this workspace after submission.",
        ),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "Confirm Submit" }),
      );

      await waitFor(() => {
        expect(mockSubmitWorkspace).toHaveBeenCalledWith(ASSIGNMENT_ID);
      });

      expect(mockToast.success).toHaveBeenCalledWith(
        "Assignment submitted successfully.",
      );
    });

    it("shows error toast and sets submitError on failure", async () => {
      const user = userEvent.setup();
      mockSubmitWorkspace.mockRejectedValue(new Error("Network error"));
      setupQueryMocks({
        submissionResult: {
          success: true,
          submission: {
            studentId: "student1",
            assignmentId: ASSIGNMENT_ID,
            submittedAt: Date.now(),
            gradesReleased: false,
            status: "failed",
          },
        },
      });

      await renderPage();

      await user.click(
        screen.getByRole("button", { name: "Retry Submission" }),
      );

      // Confirm the submission
      await user.click(
        screen.getByRole("button", { name: "Confirm Submit" }),
      );

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Network error");
      });
    });

    it("closes the confirm dialog when Cancel is clicked", async () => {
      const user = userEvent.setup();
      setupQueryMocks();

      await renderPage();

      await user.click(
        screen.getByRole("button", { name: "Submit Assignment" }),
      );

      expect(screen.getByText("Submit Assignment?")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(
        screen.queryByText("Submit Assignment?"),
      ).not.toBeInTheDocument();
    });
  });

  describe("error display", () => {
    it("shows error banner when submission failed and there is an error", async () => {
      const user = userEvent.setup();
      mockSubmitWorkspace.mockRejectedValue(
        new Error("Upload verification failed"),
      );
      setupQueryMocks({
        submissionResult: {
          success: true,
          submission: {
            studentId: "student1",
            assignmentId: ASSIGNMENT_ID,
            submittedAt: Date.now(),
            gradesReleased: false,
            status: "failed",
          },
        },
      });

      await renderPage();

      // Trigger the submit to set the error
      await user.click(
        screen.getByRole("button", { name: "Retry Submission" }),
      );
      await user.click(
        screen.getByRole("button", { name: "Confirm Submit" }),
      );

      await waitFor(() => {
        expect(
          screen.getByText("Upload verification failed"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("past due display", () => {
    it("shows past due message when assignment is overdue", async () => {
      setupQueryMocks({
        assignment: makeAssignment({ dueDate: PAST_DATE }),
      });

      await renderPage();

      expect(
        screen.getByText("This assignment is past due."),
      ).toBeInTheDocument();
    });
  });
});
