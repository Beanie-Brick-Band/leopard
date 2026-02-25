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
  capturedUploadSuccess,
} = vi.hoisted(() => ({
  mockGetUploadUrl: vi.fn(),
  mockSaveKey: vi.fn(),
  mockRemoveCode: vi.fn(),
  mockUseQuery: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
  capturedUploadSuccess: { fn: null as ((storageKey: string) => Promise<void>) | null },
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

// Mock StarterCodeUploader — capture onUploadSuccess so tests can trigger it
vi.mock("~/components/starter-code-uploader", () => ({
  StarterCodeUploader: ({
    onUploadSuccess,
  }: {
    getUploadUrl: () => Promise<unknown>;
    onUploadSuccess: (storageKey: string) => Promise<void>;
  }) => {
    capturedUploadSuccess.fn = onUploadSuccess;
    return <div data-testid="starter-code-uploader">Uploader Mock</div>;
  },
}));

import { StarterCodeCard } from "./starter-code-card";

// --- Helpers ---

const ASSIGNMENT_ID = "assignment123" as Id<"assignments">;

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

    it("renders the uploader component", () => {
      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      expect(screen.getByTestId("starter-code-uploader")).toBeInTheDocument();
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

    it("shows the remove button", () => {
      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      expect(
        screen.getByRole("button", { name: "Remove Starter Code" }),
      ).toBeInTheDocument();
    });
  });

  describe("upload callback", () => {
    it("calls saveKey and shows success toast on upload success", async () => {
      mockSaveKey.mockResolvedValue(undefined);
      render(<StarterCodeCard assignmentId={ASSIGNMENT_ID} />);

      // Trigger the onUploadSuccess callback the card passes to the uploader
      await capturedUploadSuccess.fn!("test/key.zip");

      expect(mockSaveKey).toHaveBeenCalledWith({
        assignmentId: ASSIGNMENT_ID,
        storageKey: "test/key.zip",
      });
      expect(mockToast.success).toHaveBeenCalledWith("Starter code uploaded");
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
