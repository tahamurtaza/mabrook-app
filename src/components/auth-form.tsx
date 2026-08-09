"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

const field =
  "w-full rounded-lg border border-line bg-raised px-3 py-2 text-ink outline-none transition-colors placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20";

export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: "signin" | "signup";
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /** Where to land after signing in — carries an invite link through login. */
  next?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );
  const isSignUp = mode === "signup";

  return (
    <div className="mx-auto max-w-sm py-6">
      <h1
        className="text-2xl tracking-tight text-ink"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        {isSignUp ? "Join the family list" : "Welcome back"}
      </h1>
      <p className="mt-1.5 text-sm text-muted">
        {isSignUp
          ? "Create an account to add and follow the family's occasions."
          : "Sign in to see what's coming up."}
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        {isSignUp && (
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
              Your name
            </label>
            <input
              id="name"
              name="name"
              autoComplete="name"
              required
              className={field}
              placeholder="Fatema"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={field}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={isSignUp ? 8 : undefined}
            className={field}
            placeholder={isSignUp ? "At least 8 characters" : ""}
          />
        </div>

        {state.error && (
          <p
            role="alert"
            className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {pending
            ? isSignUp
              ? "Creating account…"
              : "Signing in…"
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {isSignUp ? (
          <>
            Already have an account?{" "}
            <Link
              href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
              className="text-accent-text underline underline-offset-2"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link
              href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
              className="text-accent-text underline underline-offset-2"
            >
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
