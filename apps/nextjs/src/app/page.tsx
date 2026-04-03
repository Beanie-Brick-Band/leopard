import Link from "next/link";
import { CodeXml, History, UsersRound } from "lucide-react";

import { LeopardLogo } from "~/components/leopard-logo";
import { isAuthenticated } from "~/lib/auth-server";

const featureItems = [
  {
    icon: CodeXml,
    label: "Industry standard coding environments",
  },
  {
    icon: History,
    label: "Granular replay viewer",
  },
  {
    icon: UsersRound,
    label: "Class & assignment management",
  },
] as const;

export default async function HomePage() {
  const authenticated = await isAuthenticated();

  return (
    <main className="bg-background text-foreground relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(173,216,230,0.22),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(233,228,214,0.7),_transparent_30%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,130,160,0.15),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(40,35,50,0.5),_transparent_30%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] items-center px-6 py-12 sm:px-10 lg:px-16 xl:px-24">
        <div className="grid w-full items-center gap-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:gap-20">
          <section className="max-w-[520px]">
            <div className="mb-12 flex items-center gap-5">
              <div className="w-15 overflow-hidden rounded-lg">
                <LeopardLogo className="h-full w-full" />
              </div>

              <div className="text-foreground text-[2rem] font-semibold tracking-[-0.04em]">
                Leopard
              </div>
            </div>

            <h1 className="text-foreground max-w-[440px] text-[3.35rem] leading-[0.97] font-semibold tracking-[-0.07em] sm:text-[4.5rem]">
              The <span className="px-1">IDE</span> built for education
            </h1>

            <p className="text-muted-foreground mt-8 max-w-[470px] text-[1.08rem] leading-[1.65] sm:text-[1.2rem] sm:leading-[1.6] lg:text-[1.08rem]">
              Empower your classroom with standardized coding environments,
              real-time collaboration, and unparalleled insight into student
              progress.
            </p>

            <div className="mt-10 space-y-4">
              {featureItems.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-5">
                  <div className="bg-accent text-accent-foreground flex h-14 w-14 items-center justify-center rounded-2xl">
                    <Icon className="h-7 w-7 stroke-[1.8]" />
                  </div>
                  <span className="text-muted-foreground text-[1.05rem] tracking-[-0.02em] sm:text-[1.15rem]">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {authenticated ? (
              <div className="mt-12 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/app"
                  className="bg-foreground text-background inline-flex h-14 min-w-[220px] items-center justify-center rounded-2xl px-8 text-lg font-medium transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Open Dashboard
                </Link>
              </div>
            ) : (
              <div className="mt-12 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/auth/sign-in"
                  className="bg-foreground text-background inline-flex h-14 min-w-[180px] items-center justify-center rounded-2xl px-8 text-lg font-medium transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Log In
                </Link>
                <Link
                  href="/auth/signup"
                  className="border-border bg-card text-foreground inline-flex h-14 min-w-[180px] items-center justify-center rounded-2xl border px-8 text-lg font-medium transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </section>

          <section className="flex justify-center lg:justify-end">
            <div className="bg-card text-card-foreground w-full max-w-[780px] rounded-[28px] shadow-xl">
              <div className="flex items-center gap-4 rounded-t-[28px] border-b border-white/10 px-5 py-4 sm:px-6 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <span className="h-4 w-4 rounded-full bg-[#ff5f57]" />
                  <span className="h-4 w-4 rounded-full bg-[#febc2e]" />
                  <span className="h-4 w-4 rounded-full bg-[#28c840]" />
                </div>
                <span className="font-mono text-lg text-[#b5b3b0]">
                  main.py
                </span>
              </div>

              <div className="min-h-[360px] px-7 py-8 font-mono text-base leading-8 sm:min-h-[430px] sm:px-8 sm:py-9 sm:text-lg sm:leading-9">
                <div className="text-[#6f6f70]"># Welcome to Leopard IDE</div>
                <div className="mt-3">
                  <span className="text-[#ff66c4]">def</span>{" "}
                  <span className="text-[#f2c94c]">hello_world</span>
                  <span className="text-[#d7d7d8]">():</span>
                </div>
                <div className="pl-5">
                  <span className="text-[#ff66c4]">print</span>
                  <span className="text-[#d7d7d8]">(</span>
                  <span className="text-[#00e7b3]">"Hello, Leopard!"</span>
                  <span className="text-[#d7d7d8]">)</span>
                </div>
                <div className="mt-4">
                  <span className="text-[#f2c94c]">hello_world</span>
                  <span className="text-[#d7d7d8]">()</span>
                </div>
                <div className="mt-4 text-[#5f6063]">&gt;&gt;&gt;</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
