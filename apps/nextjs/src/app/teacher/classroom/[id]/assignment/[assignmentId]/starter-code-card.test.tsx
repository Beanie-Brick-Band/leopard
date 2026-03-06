import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Id } from "@package/backend/convex/_generated/dataModel";

// --- Hoisted mocks (available inside vi.mock factories) ---

const {
  mockGetUploadUrl,
  mockSaveKey,
  mockRemoveCode,
  mockUseQuery,
  mockToast,
} = vi.hoisted(() => ({
  mockGetUploadUrl: vi.fn(),
  mockSaveKey: vi.fn(),
  mockRemoveCode: vi.fn(),
  mockUseQuery: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useAction: (ref: string) => {
    if (ref === "getStarterCodeUploadUrl") return mockGetUploadUrl;
    if (ref === "removeStarterCode") return mockRemoveCode;
    return vi.fn();
  },
  useMutation: () => mockSaveKey,
}));

vi.mock("@package/backend/convex/_generated/api", () => ({
  api: {
    web: {
      assignment: { getById: "getById" },
      teacherAssignmentActions: {
        getStarterCodeUploadUrl: "getStarterCodeUploadUrl",
        removeStarterCode: "removeStarterCode",
      },
      teacherAssignments: {
        saveStarterCodeKey: "saveStarterCodeKey",
      },
    },
  },
}));

vi.mock("sonner", () => ({ toast: mockToast }));

import { StarterCodeCard } from "./starter-code-card";

// --- Helpers ---

const ASSIGNMENT_ID = "assignment123" as Id<"assignments">;

function createFile(name: string, sizeBytes: number): File {
  const buffer = new ArrayBuffer(sizeBytes);
  return new File([buffer], name, { type: "application/zip" });
}

// --- Tests ---

describe("StarterCodeCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({ starterCodeStorageKey: undefined });
  });

  describe("when no starter code is uploaded", () => {
    it("shows 'No starter code uploaded' message", () => {
      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      expect(screen.getByText("No starter code uploaded.")).toBeInTheDocument();
    });

    it("shows 'Upload Starter Code' label", () => {
      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      expect(screen.getByText("Upload Starter Code")).toBeInTheDocument();
    });

    it("does not show the remove button", () => {
      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      expect(
        screen.queryByRole("button", { name: /remove/i }),
      ).not.toBeInTheDocument();
    });

    it("does not show the uploaded confirmation", () => {
      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      expect(
        screen.queryByText("Starter code uploaded"),
      ).not.toBeInTheDocument();
    });
  });

  describe("when starter code exists", () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        starterCodeStorageKey: "classrooms/1/assignments/1/starter-code.zip",
      });
    });

    it("shows the uploaded confirmation", () => {
      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      expect(screen.getByText("Starter code uploaded")).toBeInTheDocument();
    });

    it("shows 'Replace Starter Code' label", () => {
      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      expect(screen.getByText("Replace Starter Code")).toBeInTheDocument();
    });

    it("shows the remove button", () => {
      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      expect(
        screen.getByRole("button", { name: "Remove Starter Code" }),
      ).toBeInTheDocument();
    });
  });

  describe("file size validation", () => {
    it("rejects files over 50MB", async () => {
      const user = userEvent.setup();
      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      const input = screen.getByLabelText("Upload Starter Code");
      const largeFile = createFile("big.zip", 51 * 1024 * 1024);

      await user.upload(input, largeFile);

      expect(mockToast.error).toHaveBeenCalledWith("File must be under 50MB");
      expect(mockGetUploadUrl).not.toHaveBeenCalled();
    });
  });

  describe("upload flow", () => {
    it("calls getUploadUrl and saveKey on successful upload", async () => {
      const user = userEvent.setup();

      // Track XHR instances created during the test
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedXHR: any;

      const OriginalXHR = globalThis.XMLHttpRequest;
      // @ts-expect-error — replacing XMLHttpRequest with a mock constructor
      globalThis.XMLHttpRequest = function MockXHR() {
        capturedXHR = {
          open: vi.fn(),
          send: vi.fn(),
          setRequestHeader: vi.fn(),
          upload: { addEventListener: vi.fn() },
          addEventListener: vi.fn(),
          status: 200,
        };
        return capturedXHR;
      };

      mockGetUploadUrl.mockResolvedValue({
        uploadUrl: "https://minio.test/upload",
        storageKey: "test/key.zip",
      });

      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      const input = screen.getByLabelText("Upload Starter Code");
      const file = createFile("starter.zip", 1024);
      await user.upload(input, file);

      // Wait for XHR to be constructed and send called (after getUploadUrl resolves)
      await waitFor(() => {
        expect(capturedXHR!.send).toHaveBeenCalled();
      });

      // Simulate successful XHR load
      const loadHandler = capturedXHR!.addEventListener.mock.calls.find(
        (call: unknown[]) => call[0] === "load",
      )?.[1] as () => void;
      loadHandler();

      await waitFor(() => {
        expect(mockSaveKey).toHaveBeenCalledWith({
          assignmentId: ASSIGNMENT_ID,
          storageKey: "test/key.zip",
        });
      });

      expect(mockToast.success).toHaveBeenCalledWith("Starter code uploaded");

      globalThis.XMLHttpRequest = OriginalXHR;
    });

    it("shows error toast when getUploadUrl fails", async () => {
      const user = userEvent.setup();
      mockGetUploadUrl.mockRejectedValue(new Error("Network error"));

      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      const input = screen.getByLabelText("Upload Starter Code");
      const file = createFile("starter.zip", 1024);
      await user.upload(input, file);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Network error");
      });
    });

    it("disables file input while uploading", async () => {
      const user = userEvent.setup();

      let resolveUploadUrl!: (value: unknown) => void;
      mockGetUploadUrl.mockReturnValue(
        new Promise((resolve) => {
          resolveUploadUrl = resolve;
        }),
      );

      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      const input = screen.getByLabelText("Upload Starter Code");
      const file = createFile("starter.zip", 1024);
      await user.upload(input, file);

      await waitFor(() => {
        expect(input).toBeDisabled();
      });

      resolveUploadUrl({
        uploadUrl: "https://minio.test/upload",
        storageKey: "test/key.zip",
      });
    });
  });

  describe("remove flow", () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue({
        starterCodeStorageKey: "classrooms/1/assignments/1/starter-code.zip",
      });
    });

    it("calls removeCode after confirmation", async () => {
      const user = userEvent.setup();
      vi.stubGlobal("confirm", vi.fn(() => true));
      mockRemoveCode.mockResolvedValue(undefined);

      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      await user.click(
        screen.getByRole("button", { name: "Remove Starter Code" }),
      );

      await waitFor(() => {
        expect(mockRemoveCode).toHaveBeenCalledWith({
          assignmentId: ASSIGNMENT_ID,
        });
      });

      expect(mockToast.success).toHaveBeenCalledWith("Starter code removed");

      vi.unstubAllGlobals();
    });

    it("does nothing when confirmation is cancelled", async () => {
      const user = userEvent.setup();
      vi.stubGlobal("confirm", vi.fn(() => false));

      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      await user.click(
        screen.getByRole("button", { name: "Remove Starter Code" }),
      );

      expect(mockRemoveCode).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it("shows error toast when remove fails", async () => {
      const user = userEvent.setup();
      vi.stubGlobal("confirm", vi.fn(() => true));
      mockRemoveCode.mockRejectedValue(new Error("Delete failed"));

      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      await user.click(
        screen.getByRole("button", { name: "Remove Starter Code" }),
      );

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Delete failed");
      });

      vi.unstubAllGlobals();
    });

    it("shows 'Removing...' while remove is in progress", async () => {
      const user = userEvent.setup();
      vi.stubGlobal("confirm", vi.fn(() => true));

      let resolveRemove!: () => void;
      mockRemoveCode.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveRemove = resolve;
        }),
      );

      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      await user.click(
        screen.getByRole("button", { name: "Remove Starter Code" }),
      );

      await waitFor(() => {
        expect(screen.getByText("Removing...")).toBeInTheDocument();
      });

      resolveRemove();

      await waitFor(() => {
        expect(screen.queryByText("Removing...")).not.toBeInTheDocument();
      });

      vi.unstubAllGlobals();
    });
  });
});
