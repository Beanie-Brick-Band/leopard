"use client";

import { useState } from "react";

import { Button } from "@package/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@package/ui/dropdown-menu";
import { Input } from "@package/ui/input";
import { Label } from "@package/ui/label";

import { authClient } from "~/lib/auth-client";

export function Navbar() {
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    setIsLoading(true);
    try {
      if (isSignUp) {
        await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0] || "User", // Use email prefix as name
        });
      } else {
        await authClient.signIn.email({
          email,
          password,
        });
      }
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await authClient.signOut();
  };

  if (isPending) {
    return (
      <nav className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="text-lg font-semibold">Leopard</div>
          <div className="bg-muted h-8 w-32 animate-pulse rounded"></div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="text-lg font-semibold">Leopard</div>

        {session?.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full">
                  {session.user.name?.[0]?.toUpperCase() ||
                    session.user.email?.[0]?.toUpperCase() ||
                    "U"}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5 text-sm">
                <div className="font-medium">
                  Hi, {session.user.name || session.user.email}!
                </div>
              </div>
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="email" className="sr-only">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-8 w-40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="password" className="sr-only">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-8 w-32"
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleAuth}
              disabled={isLoading || !email || !password}
              className="h-8"
            >
              {isLoading ? "Loading..." : isSignUp ? "Sign Up" : "Login"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSignUp(!isSignUp)}
              className="h-8"
            >
              {isSignUp ? "Login" : "Sign Up"}
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
