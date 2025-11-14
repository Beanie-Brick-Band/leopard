import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication - Leopard",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
