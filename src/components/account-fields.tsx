"use client";

import { startTransition, useActionState, useId, useState } from "react";
import {
  updateEmail,
  updateName,
  updatePassword,
  type AccountFormState,
} from "@/app/actions/settings";
import { fieldClass, labelClass, primaryButton } from "./form-styles";

/** The editable rows of the Account section. */
export function AccountFields({
  name,
  firstName,
  lastName,
  email,
}: {
  name: string;
  firstName: string;
  lastName: string | null;
  email: string;
}) {
  const firstId = useId();
  const lastId = useId();
  const emailId = useId();
  const newId = useId();
  const confirmId = useId();

  return (
    <>
      <EditableRow label="Name" value={name} action={updateName} saved="Name updated.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={firstId} className={labelClass}>
              First name
            </label>
            <input
              id={firstId}
              name="firstName"
              autoComplete="given-name"
              required
              maxLength={40}
              defaultValue={firstName}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={lastId} className={labelClass}>
              Last name
            </label>
            <input
              id={lastId}
              name="lastName"
              autoComplete="family-name"
              required
              maxLength={40}
              defaultValue={lastName ?? ""}
              className={fieldClass}
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-faint">
          Your groups will see this, including on any dates you&apos;ve shared.
        </p>
      </EditableRow>

      <EditableRow label="Email" value={email} action={updateEmail} saved="Email updated.">
        <div>
          <label htmlFor={emailId} className={labelClass}>
            New email
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={email}
            className={fieldClass}
          />
          <p className="mt-1.5 text-xs text-faint">You&apos;ll use this to sign in.</p>
        </div>
        <CurrentPassword />
      </EditableRow>

      <EditableRow
        label="Password"
        value="••••••••"
        action={updatePassword}
        saved="Password changed. Any other devices have been signed out."
      >
        <CurrentPassword />
        <div>
          <label htmlFor={newId} className={labelClass}>
            New password
          </label>
          <input
            id={newId}
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor={confirmId} className={labelClass}>
            New password again
          </label>
          <input
            id={confirmId}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={fieldClass}
          />
        </div>
      </EditableRow>
    </>
  );
}

function CurrentPassword() {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        Current password
      </label>
      <input
        id={id}
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        className={fieldClass}
      />
    </div>
  );
}

function EditableRow({
  label,
  value,
  action,
  saved,
  children,
}: {
  label: string;
  value: string;
  action: (state: AccountFormState, formData: FormData) => Promise<AccountFormState>;
  saved: string;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    async (previous, formData) => {
      const result = await action(previous, formData);
      if (!result.error) {
        setEditing(false);
        setJustSaved(true);
      }
      return result;
    },
    {},
  );

  return (
    <div className="py-2.5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 sm:grid-cols-[9rem_minmax(0,1fr)_auto]">
        <dt className="text-muted">{label}</dt>
        <dd className="col-start-1 row-start-2 min-w-0 break-words text-ink sm:col-start-2 sm:row-start-1">
          {value}
        </dd>
        <button
          type="button"
          aria-expanded={editing}
          onClick={() => {
            setEditing(!editing);
            setJustSaved(false);
          }}
          className="col-start-2 row-span-2 row-start-1 rounded-md px-2 py-1 text-xs font-medium text-ink transition-colors hover:bg-sunken sm:col-start-3 sm:row-span-1"
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {justSaved && (
        <p role="status" className="mt-1 text-xs text-hijri sm:ml-[10rem]">
          {saved}
        </p>
      )}

      {editing && (
        <form
          // Not `action=`: React clears a form after that, and a refused save
          // shouldn't make someone retype everything.
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            startTransition(() => formAction(data));
          }}
          className="mt-3 space-y-4 rounded-xl border border-line bg-surface p-4 sm:p-5"
        >
          {children}

          {state.error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}

          <button type="submit" disabled={pending} className={primaryButton}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}
    </div>
  );
}
