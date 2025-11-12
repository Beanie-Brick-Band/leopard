import type { Metadata, Viewport } from "next";
import { Syne, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";

import { cn } from "@package/ui";
import { ThemeProvider } from "@package/ui/theme";

import { env } from "~/env";

import "~/app/styles.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    env.VERCEL_ENV === "production"
      ? "https://leopard-ide.vercel.app"
      : "http://localhost:3000",
  ),
  title: "Leopard - Authentic Code, Verified Learning",
  description: "A web-based platform designed for post-secondary institutions to ensure academic integrity in coding assignments. Leopard provides students with a modern IDE while capturing granular version history to verify the authenticity of their work.",
  openGraph: {
    title: "Leopard - Authentic Code, Verified Learning",
    description: "A web-based platform for ensuring academic integrity in coding assignments with version tracking and replay capabilities.",
    url: "https://leopard-ide.vercel.app",
    siteName: "Leopard",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbbf24" },
    { media: "(prefers-color-scheme: dark)", color: "#18181b" },
  ],
};

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans-override",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-override",
  display: "swap",
});

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background text-foreground min-h-screen font-sans antialiased",
          syne.variable,
          plusJakartaSans.variable,
          jetbrainsMono.variable,
        )}
      >
        <ThemeProvider>
          {props.children}
        </ThemeProvider>
      </body>
    </html>
  );
}
