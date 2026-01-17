import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  Authenticated,
  AuthLoading,
  ConvexAuthTestProvider,
  Unauthenticated,
  useConvexAuth,
} from "~/test/convex-auth-test-provider";
import HeaderAuth from "./header-auth";

vi.mock("~/lib/auth", () => ({
  Authenticated,
  Unauthenticated,
  AuthLoading,
  useConvexAuth,
}));

describe("HeaderAuth", () => {
  describe("when authenticated", () => {
    it("renders sign out and go to app buttons", () => {
      render(
        <ConvexAuthTestProvider isAuthenticated={true}>
          <HeaderAuth />
        </ConvexAuthTestProvider>,
      );

      expect(
        screen.getByRole("button", { name: "Sign Out" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Go to App" }),
      ).toBeInTheDocument();
    });

    it("does not render sign in button", () => {
      render(
        <ConvexAuthTestProvider isAuthenticated={true}>
          <HeaderAuth />
        </ConvexAuthTestProvider>,
      );

      expect(
        screen.queryByRole("button", { name: "Sign In" }),
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
      expect(screen.getByRole("link", { name: "Go to App" })).toHaveAttribute(
        "href",
        "/app",
      );
    });
  });

  describe("when unauthenticated", () => {
    it("renders sign in button", () => {
      render(
        <ConvexAuthTestProvider isAuthenticated={false}>
          <HeaderAuth />
        </ConvexAuthTestProvider>,
      );

      expect(
        screen.getByRole("button", { name: "Sign In" }),
      ).toBeInTheDocument();
    });

    it("does not render sign out or go to app buttons", () => {
      render(
        <ConvexAuthTestProvider isAuthenticated={false}>
          <HeaderAuth />
        </ConvexAuthTestProvider>,
      );

      expect(
        screen.queryByRole("button", { name: "Sign Out" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Go to App" }),
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
        screen.queryByRole("button", { name: "Sign In" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Sign Out" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Go to App" }),
      ).not.toBeInTheDocument();
    });
  });
});
