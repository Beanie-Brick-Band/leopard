import { Suspense, act } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Id } from "@package/backend/convex/_generated/dataModel";

// --- Hoisted mocks ---

const {
  mockCreateAssignment,
  mockGetUploadUrl,
  mockSaveStarterCodeKey,
  mockPush,
  mockToast,
} = vi.hoisted(() => ({
  mockCreateAssignment: vi.fn(),
  mockGetUploadUrl: vi.fn(),
  mockSaveStarterCodeKey: vi.fn(),
  mockPush: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("convex/react", () => ({
  useMutation: (ref: string) => {
    if (ref === "createAssignment") return mockCreateAssignment;
    if (ref === "saveStarterCodeKey") return mockSaveStarterCodeKey;
    return vi.fn();
  },
  useAction: () => mockGetUploadUrl,
}));

vi.mock("@package/backend/convex/_generated/api", () => ({
  api: {
    web: {
      teacherAssignments: {
        createAssignment: "createAssignment",
        saveStarterCodeKey: "saveStarterCodeKey",
      },
      teacherAssignmentActions: {
        getStarterCodeUploadUrl: "getStarterCodeUploadUrl",
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

import NewAssignmentPage from "./page";

// --- Helpers ---

const CLASSROOM_ID = "classroom123" as Id<"classrooms">;
const ASSIGNMENT_ID = "assignment456" as Id<"assignments">;

async function renderPage() {
  await act(async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <NewAssignmentPage params={Promise.resolve({ id: CLASSROOM_ID })} />
      </Suspense>,
    );
  });
}

function createFile(name: string, sizeBytes: number): File {
  const buffer = new ArrayBuffer(sizeBytes);
  return new File([buffer], name, { type: "application/zip" });
}

// --- Tests ---

describe("NewAssignmentPage — starter code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAssignment.mockResolvedValue(ASSIGNMENT_ID);
  });

  it("renders the starter code file input", async () => {
    await renderPage();

    expect(screen.getByLabelText(/starter code/i)).toBeInTheDocument();
  });

  it("shows helper text for the file input", async () => {
    await renderPage();

    expect(
      screen.getByText(/upload a \.zip file with starter code/i),
    ).toBeInTheDocument();
  });

  it("accepts only .zip files", async () => {
    await renderPage();

    const input = screen.getByLabelText(/starter code/i);
    expect(input).toHaveAttribute("accept", ".zip");
  });

  describe("file size validation", () => {
    it("rejects files over 50MB", async () => {
      const user = userEvent.setup();
      await renderPage();

      const input = screen.getByLabelText(/starter code/i);
      const largeFile = createFile("big.zip", 51 * 1024 * 1024);
      await user.upload(input, largeFile);

      expect(mockToast.error).toHaveBeenCalledWith("File must be under 50MB");
    });
  });

  describe("form submission with starter code", () => {
    async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
      await user.clear(screen.getByLabelText(/^name$/i));
      await user.type(screen.getByLabelText(/^name$/i), "Test Assignment");

      await user.click(
        screen.getByRole("button", { name: /create assignment/i }),
      );
    }

    it("uploads starter code after assignment creation", async () => {
      const user = userEvent.setup();
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", mockFetch);

      mockGetUploadUrl.mockResolvedValue({
        uploadUrl: "https://minio.test/upload",
        storageKey: "test/key.zip",
      });

      await renderPage();

      const input = screen.getByLabelText(/starter code/i);
      const file = createFile("starter.zip", 1024);
      await user.upload(input, file);

      await fillAndSubmit(user);

      await waitFor(() => {
        expect(mockCreateAssignment).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockGetUploadUrl).toHaveBeenCalledWith({
          assignmentId: ASSIGNMENT_ID,
        });
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("https://minio.test/upload", {
          method: "PUT",
          body: file,
          headers: { "Content-Type": "application/zip" },
        });
      });

      await waitFor(() => {
        expect(mockSaveStarterCodeKey).toHaveBeenCalledWith({
          assignmentId: ASSIGNMENT_ID,
          storageKey: "test/key.zip",
        });
      });

      expect(mockToast.success).toHaveBeenCalledWith(
        "Assignment created with starter code",
      );

      vi.unstubAllGlobals();
    });

    it("creates assignment without upload when no file selected", async () => {
      const user = userEvent.setup();
      await renderPage();

      await fillAndSubmit(user);

      await waitFor(() => {
        expect(mockCreateAssignment).toHaveBeenCalled();
      });

      expect(mockGetUploadUrl).not.toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith("Assignment created");
    });

    it("shows warning when upload fails but assignment was created", async () => {
      const user = userEvent.setup();
      mockGetUploadUrl.mockRejectedValue(new Error("Upload error"));

      await renderPage();

      const input = screen.getByLabelText(/starter code/i);
      const file = createFile("starter.zip", 1024);
      await user.upload(input, file);

      await fillAndSubmit(user);

      await waitFor(() => {
        expect(mockToast.warning).toHaveBeenCalledWith(
          "Assignment created, but starter code upload failed. You can upload it from the assignment page.",
        );
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
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
