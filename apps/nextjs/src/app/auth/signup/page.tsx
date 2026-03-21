import { redirect } from "next/navigation";

import { isAuthenticated } from "~/lib/auth-server";
import SignupForm from "./signup-form";

export default async function SignupPage() {
  if (await isAuthenticated()) {
    redirect("/app");
  }

  return <SignupForm />;
}
