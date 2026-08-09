import { redirect } from "next/navigation";
import { signUp } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Create an account — Mabrook" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;
  const target = next === undefined ? undefined : safeNext(next);

  if (await getCurrentUser()) redirect(target ?? "/");

  return <AuthForm mode="signup" action={signUp} next={target} />;
}
