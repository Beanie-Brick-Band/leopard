import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  Authenticated,
  AuthLoading,
  ConvexAuthTestProvider,
  Unauthenticated,
  useConvexAuth,
} from "~/test/convex-auth-test-provider";
import HeaderAuth from "./header-auth";

const { mockUsePathname } = vi.hoisted(() => ({
  mockUsePathname: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: mockUsePathname,
}));

vi.mock("~/lib/auth", () => ({
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useConvexAuth,
}));

describe("HeaderAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/teacher");
  });

  describe("when authenticated", () => {
    it("renders sign out and dashboard links", () => {
      render(
        <ConvexAuthTestProvider isAuthenticated={true}>
          <HeaderAuth />
        </ConvexAuthTestProvider>,
      );

      expect(
        screen.getByRole("link", { name: "Sign Out" }),
      ).toBeInTheDocument();
    });

    it("hides the dashboard link on the dashboard route", () => {
      mockUsePathname.mockReturnValue("/app");

      render(
        <ConvexAuthTestProvider isAuthenticated={true}>
          <HeaderAuth />
        </ConvexAuthTestProvider>,
      );

      expect(
        screen.queryByRole("link", { name: "Open Dashboard" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Sign Out" }),
      ).toBeInTheDocument();
    });

    it("does not render sign in button", () => {
      render(
        <ConvexAuthTestProvider isAuthenticated={true}>
          <HeaderAuth />
        </ConvexAuthTestProvider>,
      );

      expect(
        screen.queryByRole("link", { name: "Sign In" }),
      ).not.toBeInTheDocument();
    });

    it("links to correct routes", () => {
      render(
        <ConvexAuthTestProvider isAuthenticated={true}>
          <HeaderAuth />
        </ConvexAuthTestProvider>,
      );

      expect(screen.getByRole("link", { name: "Sign Out" })).toHaveAttribute(
        "href",
        "/auth/sign-out",
      );
    });
  });

  describe("when unauthenticated", () => {
    it("renders sign in link", () => {
      render(
        <ConvexAuthTestProvider isAuthenticated={false}>
          <HeaderAuth />
        </ConvexAuthTestProvider>,
      );

      expect(screen.getByRole("link", { name: "Sign In" })).toBeInTheDocument();
    });

    it("does not render sign out or dashboard links", () => {
      render(
        <ConvexAuthTestProvider isAuthenticated={false}>
          <HeaderAuth />
        </ConvexAuthTestProvider>,
      );

      expect(
        screen.queryByRole("link", { name: "Sign Out" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Open Dashboard" }),
      ).not.toBeInTheDocument();
    });

    it("links sign in to correct route", () => {
      render(
        <ConvexAuthTestProvider isAuthenticated={false}>
          <HeaderAuth />
        </ConvexAuthTestProvider>,
      );

      expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute(
        "href",
        "/auth/sign-in",
      );
    });
  });

  describe("when loading", () => {
    it("renders nothing", () => {
      render(
        <ConvexAuthTestProvider isLoading={true}>
          <HeaderAuth />
        </ConvexAuthTestProvider>,
      );

      expect(
        screen.queryByRole("link", { name: "Sign In" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Sign Out" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Open Dashboard" }),
      ).not.toBeInTheDocument();
    });
  });
});
