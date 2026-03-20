import { Suspense } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Id } from "@package/backend/convex/_generated/dataModel";

import TeacherSubmissionReviewPage from "./page";

// --- Hoisted mocks ---

const {
  mockUseQuery,
  mockUseMutation,
  mockToast,
  mockGetSubmissionDownload,
  mockTriggerDownload,
} = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockUseMutation: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
  mockGetSubmissionDownload: vi.fn(),
  mockTriggerDownload: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args) as unknown,
  useMutation: () => mockUseMutation() as unknown,
}));

vi.mock("@package/backend/convex/_generated/api", () => ({
  api: {
    web: {
      assignment: { getById: "getById" },
      teacherAssignments: {
        getSubmissionById: "getSubmissionById",
        gradeSubmission: "gradeSubmission",
        provideSubmissionFeedback: "provideSubmissionFeedback",
      },
    },
  },
}));

vi.mock("~/app/app/actions", () => ({
  getSubmissionDownload: (...args: unknown[]) =>
    mockGetSubmissionDownload(...args) as unknown,
}));

vi.mock("~/lib/download", () => ({
  triggerDownload: (...args: unknown[]) =>
    mockTriggerDownload(...args) as unknown,
}));

vi.mock("sonner", () => ({ toast: mockToast }));

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

vi.mock("~/components/scrubber", () => ({
  TextReplayScrubberComponent: () => (
    <div data-testid="scrubber">Scrubber Mock</div>
  ),
}));

// --- Helpers ---

const CLASSROOM_ID = "classroom123" as Id<"classrooms">;
const ASSIGNMENT_ID = "assignment456" as Id<"assignments">;
const SUBMISSION_ID = "submission789" as Id<"submissions">;
const WORKSPACE_ID = "workspace999" as Id<"workspaces">;

function makeAssignment() {
  return {
    _id: ASSIGNMENT_ID,
    name: "Test Assignment",
    description: "Do the thing",
    dueDate: Date.now() + 86_400_000,
    classroomId: CLASSROOM_ID,
  };
}

function makeSubmission(overrides: Record<string, unknown> = {}) {
  return {
    _id: SUBMISSION_ID,
    studentId: "student1",
    studentName: "Jane Doe",
    studentEmail: "jane@test.com",
    assignmentId: ASSIGNMENT_ID,
    workspaceId: WORKSPACE_ID,
    submittedAt: Date.now(),
    gradesReleased: false,
    grade: undefined,
    gradedAt: undefined,
    submissionFeedback: undefined,
    submissionStorageKey: undefined,
    ...overrides,
  };
}

function setupQueryMocks({
  assignment = makeAssignment(),
  submission = makeSubmission(),
}: {
  assignment?: ReturnType<typeof makeAssignment>;
  submission?: ReturnType<typeof makeSubmission> | undefined;
} = {}) {
  mockUseQuery.mockImplementation((ref: string) => {
    if (ref === "getById") return assignment;
    if (ref === "getSubmissionById") return submission;
    return undefined;
  });
}

async function renderPage() {
  const params = Promise.resolve({
    id: CLASSROOM_ID,
    assignmentId: ASSIGNMENT_ID,
    submissionId: SUBMISSION_ID,
  });

  // eslint-disable-next-line @typescript-eslint/require-await
  await act(async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <TeacherSubmissionReviewPage params={params} />
      </Suspense>,
    );
  });
}

// --- Tests ---

describe("TeacherSubmissionReviewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue(vi.fn());
  });

  describe("loading state", () => {
    it("shows spinner while data is loading", async () => {
      mockUseQuery.mockReturnValue(undefined);

      await renderPage();

      expect(screen.queryByText("Review Submission")).not.toBeInTheDocument();
    });
  });

  describe("submission details", () => {
    it("renders student name and assignment name", async () => {
      setupQueryMocks();

      await renderPage();

      expect(screen.getByText("Review Submission")).toBeInTheDocument();
      expect(screen.getByText(/Test Assignment.*Jane Doe/)).toBeInTheDocument();
    });

    it("renders workspace ID", async () => {
      setupQueryMocks();

      await renderPage();

      expect(screen.getByText(WORKSPACE_ID)).toBeInTheDocument();
    });
  });

  describe("download button", () => {
    it("does not show download button when no submissionStorageKey", async () => {
      setupQueryMocks({
        submission: makeSubmission({ submissionStorageKey: undefined }),
      });

      await renderPage();

      expect(
        screen.queryByRole("button", { name: /download submission/i }),
      ).not.toBeInTheDocument();
    });

    it("shows download button when submissionStorageKey exists", async () => {
      setupQueryMocks({
        submission: makeSubmission({
          submissionStorageKey: "submissions/c1/a1/s1/submission.zip",
        }),
      });

      await renderPage();

      expect(
        screen.getByRole("button", { name: /download submission/i }),
      ).toBeInTheDocument();
    });

    it("calls getSubmissionDownload and triggerDownload on click", async () => {
      const user = userEvent.setup();
      mockGetSubmissionDownload.mockResolvedValue({
        downloadUrl: "https://storage.example.com/file.zip",
      });
      setupQueryMocks({
        submission: makeSubmission({
          submissionStorageKey: "submissions/c1/a1/s1/submission.zip",
        }),
      });

      await renderPage();

      await user.click(
        screen.getByRole("button", { name: /download submission/i }),
      );

      await waitFor(() => {
        expect(mockGetSubmissionDownload).toHaveBeenCalledWith(SUBMISSION_ID);
      });

      expect(mockTriggerDownload).toHaveBeenCalledWith(
        "https://storage.example.com/file.zip",
      );
    });

    it("shows 'Preparing...' while download is in progress", async () => {
      const user = userEvent.setup();

      let resolveDownload!: (value: { downloadUrl: string }) => void;
      mockGetSubmissionDownload.mockReturnValue(
        new Promise((resolve) => {
          resolveDownload = resolve;
        }),
      );

      setupQueryMocks({
        submission: makeSubmission({
          submissionStorageKey: "submissions/c1/a1/s1/submission.zip",
        }),
      });

      await renderPage();

      await user.click(
        screen.getByRole("button", { name: /download submission/i }),
      );

      await waitFor(() => {
        expect(screen.getByText("Preparing...")).toBeInTheDocument();
      });

      resolveDownload({ downloadUrl: "https://example.com/f.zip" });

      await waitFor(() => {
        expect(screen.queryByText("Preparing...")).not.toBeInTheDocument();
      });
    });

    it("shows error toast when download fails", async () => {
      const user = userEvent.setup();
      mockGetSubmissionDownload.mockRejectedValue(new Error("Access denied"));
      setupQueryMocks({
        submission: makeSubmission({
          submissionStorageKey: "submissions/c1/a1/s1/submission.zip",
        }),
      });

      await renderPage();

      await user.click(
        screen.getByRole("button", { name: /download submission/i }),
      );

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Access denied");
      });

      expect(mockTriggerDownload).not.toHaveBeenCalled();
    });
  });

  describe("grading", () => {
    it("renders grade and feedback inputs", async () => {
      setupQueryMocks();

      await renderPage();

      expect(screen.getByLabelText("Grade")).toBeInTheDocument();
      expect(screen.getByLabelText("Feedback")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /save grade & feedback/i }),
      ).toBeInTheDocument();
    });

    it("populates grade and feedback from submission data", async () => {
      setupQueryMocks({
        submission: makeSubmission({
          grade: 85,
          submissionFeedback: "Good work!",
          gradedAt: Date.now(),
        }),
      });

      await renderPage();

      expect(screen.getByLabelText("Grade")).toHaveValue(85);
      expect(screen.getByLabelText("Feedback")).toHaveValue("Good work!");
    });
  });
});
