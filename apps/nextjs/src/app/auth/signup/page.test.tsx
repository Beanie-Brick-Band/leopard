import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SignupPage from "./page";

const { mockIsAuthenticated, mockRedirect } = vi.hoisted(() => ({
  mockIsAuthenticated: vi.fn(),
  mockRedirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("~/lib/auth-server", () => ({
  isAuthenticated: mockIsAuthenticated,
}));

vi.mock("./signup-form", () => ({
  default: () => <div>Sign Up Form</div>,
}));

describe("SignupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockResolvedValue(false);
  });

  it("redirects authenticated users to the app", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(SignupPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/app");
  });

  it("renders the sign-up form for unauthenticated users", async () => {
    render(await SignupPage());

    expect(screen.getByText("Sign Up Form")).toBeInTheDocument();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
