import { act, Suspense } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Id } from "@package/backend/convex/_generated/dataModel";

import NewAssignmentPage from "./page";

// --- Hoisted mocks ---

const {
  mockCreateAssignment,
  mockGetUploadUrl,
  mockPush,
  mockToast,
  mockUploaderHasFiles,
  mockUploaderUpload,
} = vi.hoisted(() => ({
  mockCreateAssignment: vi.fn(),
  mockGetUploadUrl: vi.fn(),
  mockPush: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  mockUploaderHasFiles: vi.fn(() => false),
  mockUploaderUpload: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useMutation: (ref: string) => {
    if (ref === "createAssignment") return mockCreateAssignment;
    return vi.fn();
  },
  useAction: () => mockGetUploadUrl,
}));

vi.mock("@package/backend/convex/_generated/api", () => ({
  api: {
    web: {
      teacherAssignments: {
        createAssignment: "createAssignment",
      },
      teacherAssignmentActions: {
        generateStarterCodeUploadUrl: "generateStarterCodeUploadUrl",
      },
    },
  },
}));

vi.mock("sonner", () => ({ toast: mockToast }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
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

vi.mock("~/components/editor", () => ({
  Editor: ({
    onChange,
    placeholder,
  }: {
    content: string;
    onChange: (value: string) => void;
    placeholder: string;
  }) => (
    <textarea
      data-testid="editor"
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("~/lib/auth", () => ({
  Authenticated: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  Unauthenticated: () => null,
  AuthLoading: () => null,
}));

// Mock StarterCodeUploader — expose ref handle via hoisted mocks
vi.mock("~/components/starter-code-uploader", () => ({
  StarterCodeUploader: ({
    ref,
  }: {
    ref: React.Ref<{ hasFiles: () => boolean; upload: () => Promise<void> }>;
    autoProceed: boolean;
    getUploadUrl: () => Promise<unknown>;
    onUploadSuccess: (storageKey: string) => Promise<void>;
  }) => {
    // Wire up the ref so the form can call hasFiles/upload
    if (typeof ref === "function") {
      ref({
        hasFiles: mockUploaderHasFiles,
        upload: mockUploaderUpload,
      });
    } else if (ref && typeof ref === "object") {
      (ref as { current: unknown }).current = {
        hasFiles: mockUploaderHasFiles,
        upload: mockUploaderUpload,
      };
    }
    return <div data-testid="starter-code-uploader">Uploader Mock</div>;
  },
}));

// --- Helpers ---

const CLASSROOM_ID = "classroom123" as Id<"classrooms">;
const ASSIGNMENT_ID = "assignment456" as Id<"assignments">;

async function renderPage() {
  // async needed for act() to flush suspended promises from use()
  // eslint-disable-next-line @typescript-eslint/require-await
  await act(async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <NewAssignmentPage params={Promise.resolve({ id: CLASSROOM_ID })} />
      </Suspense>,
    );
  });
}

// --- Tests ---

describe("NewAssignmentPage — starter code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAssignment.mockResolvedValue(ASSIGNMENT_ID);
    mockUploaderHasFiles.mockReturnValue(false);
  });

  it("renders the uploader component", async () => {
    await renderPage();

    expect(screen.getByTestId("starter-code-uploader")).toBeInTheDocument();
  });

  it("renders the starter code label", async () => {
    await renderPage();

    expect(screen.getByText("Starter Code (optional)")).toBeInTheDocument();
  });

  describe("form submission with starter code", () => {
    async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
      await user.clear(screen.getByLabelText(/^name$/i));
      await user.type(screen.getByLabelText(/^name$/i), "Test Assignment");

      await user.click(
        screen.getByRole("button", { name: /create assignment/i }),
      );
    }

    it("uploads starter code before creating assignment", async () => {
      const user = userEvent.setup();
      mockUploaderHasFiles.mockReturnValue(true);
      mockUploaderUpload.mockResolvedValue(undefined);

      await renderPage();
      await fillAndSubmit(user);

      await waitFor(() => {
        expect(mockUploaderUpload).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockCreateAssignment).toHaveBeenCalled();
      });
    });

    it("creates assignment without upload when no file selected", async () => {
      const user = userEvent.setup();
      mockUploaderHasFiles.mockReturnValue(false);

      await renderPage();
      await fillAndSubmit(user);

      await waitFor(() => {
        expect(mockCreateAssignment).toHaveBeenCalled();
      });

      expect(mockUploaderUpload).not.toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith("Assignment created");
    });

    it("shows error when upload fails", async () => {
      const user = userEvent.setup();
      mockUploaderHasFiles.mockReturnValue(true);
      mockUploaderUpload.mockRejectedValue(new Error("Upload error"));

      await renderPage();
      await fillAndSubmit(user);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Upload error");
      });

      // Assignment should not be created if upload fails
      expect(mockCreateAssignment).not.toHaveBeenCalled();
    });

    it("navigates to assignment page after creation", async () => {
      const user = userEvent.setup();
      await renderPage();

      await fillAndSubmit(user);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          `/teacher/classroom/${CLASSROOM_ID}/assignment/${ASSIGNMENT_ID}`,
        );
      });
    });
  });
});
