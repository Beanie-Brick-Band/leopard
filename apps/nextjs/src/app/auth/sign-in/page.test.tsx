import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "./page";

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

vi.mock("./sign-in-form", () => ({
  default: () => <div>Sign In Form</div>,
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockResolvedValue(false);
  });

  it("redirects authenticated users to the app", async () => {
    mockIsAuthenticated.mockResolvedValue(true);
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(LoginPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/app");
  });

  it("renders the sign-in form for unauthenticated users", async () => {
    render(await LoginPage());

    expect(screen.getByText("Sign In Form")).toBeInTheDocument();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
