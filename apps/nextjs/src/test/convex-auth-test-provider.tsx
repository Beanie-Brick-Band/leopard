import type { ConvexAuthState } from "convex/react";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

const ConvexAuthTestContext = createContext<ConvexAuthState | undefined>(
  undefined,
);

export interface ConvexAuthTestProviderProps {
  children: ReactNode;
  isLoading?: boolean;
  isAuthenticated?: boolean;
}

/**
 * Test provider that mocks the Convex auth context.
 * Use this to wrap components that depend on Convex auth state in tests.
 */
export function ConvexAuthTestProvider({
  children,
  isLoading = false,
  isAuthenticated = false,
}: ConvexAuthTestProviderProps) {
  return (
    <ConvexAuthTestContext.Provider value={{ isLoading, isAuthenticated }}>
      {children}
    </ConvexAuthTestContext.Provider>
  );
}

/**
 * Test version of useConvexAuth that reads from ConvexAuthTestProvider.
 * Mock convex/react's useConvexAuth with this in your tests.
 */
export function useConvexAuth(): ConvexAuthState {
  const context = useContext(ConvexAuthTestContext);
  if (context === undefined) {
    throw new Error(
      "useConvexAuth must be used within a ConvexAuthTestProvider in tests",
    );
  }
  return context;
}

/**
 * Test version of Authenticated component.
 * Mirrors the real Convex implementation but uses the test context.
 */
export function Authenticated({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading || !isAuthenticated) {
    return null;
  }
  return <>{children}</>;
}

/**
 * Test version of Unauthenticated component.
 * Mirrors the real Convex implementation but uses the test context.
 */
export function Unauthenticated({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading || isAuthenticated) {
    return null;
  }
  return <>{children}</>;
}

/**
 * Test version of AuthLoading component.
 * Mirrors the real Convex implementation but uses the test context.
 */
export function AuthLoading({ children }: { children: ReactNode }) {
  const { isLoading } = useConvexAuth();
  if (!isLoading) {
    return null;
  }
  return <>{children}</>;
}
