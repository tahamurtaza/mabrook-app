"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { fieldClass, labelClass, primaryButton } from "./form-styles";
import { Mark } from "./icons";

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
    <div className="mx-auto max-w-sm py-8 sm:py-14">
      <Mark className="size-10" />
      <h1 className="font-display mt-5 text-[2rem] leading-tight font-medium text-ink">
        {isSignUp ? "Join the family list" : "Welcome back"}
      </h1>
      <p className="mt-1.5 text-[0.95rem] text-muted">
        {isSignUp
          ? "Create an account to add and follow the family's occasions — in both calendars."
          : "Sign in to see what's coming up."}
      </p>

      <form
        // Not `action=`: React clears a form after that, and a refused attempt
        // shouldn't make someone retype everything.
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          startTransition(() => formAction(data));
        }}
        className="mt-8 space-y-4"
      >
        {next && <input type="hidden" name="next" value={next} />}
        {isSignUp && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className={labelClass}>
                First name
              </label>
              <input
                id="firstName"
                name="firstName"
                autoComplete="given-name"
                required
                maxLength={40}
                className={fieldClass}
                placeholder="Fatema"
              />
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass}>
                Last name
              </label>
              <input
                id="lastName"
                name="lastName"
                autoComplete="family-name"
                required
                maxLength={40}
                className={fieldClass}
                placeholder="Bombaywala"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={fieldClass}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={isSignUp ? 8 : undefined}
            className={fieldClass}
            placeholder={isSignUp ? "At least 8 characters" : ""}
          />
        </div>

        {state.error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className={`${primaryButton} w-full py-3`}>
          {pending
            ? isSignUp
              ? "Creating account…"
              : "Signing in…"
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <p className="mt-6 border-t border-line pt-5 text-sm text-muted">
        {isSignUp ? (
          <>
            Already have an account?{" "}
            <Link
              href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
              className="font-medium text-ink underline underline-offset-2"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link
              href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
              className="font-medium text-ink underline underline-offset-2"
            >
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
