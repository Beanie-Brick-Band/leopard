import { redirect } from "next/navigation";

import { isAuthenticated } from "~/lib/auth-server";
import SignInForm from "./sign-in-form";

export default async function LoginPage() {
  if (await isAuthenticated()) {
    redirect("/app");
  }

  return <SignInForm />;
}
