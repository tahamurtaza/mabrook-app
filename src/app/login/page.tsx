import { redirect } from "next/navigation";
import { signIn } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/safe-next";

export const metadata = { title: "Sign in — Mabrook" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const target = next === undefined ? undefined : safeNext(next);

  if (await getCurrentUser()) redirect(target ?? "/");

  return <AuthForm mode="signin" action={signIn} next={target} />;
}
