"use client";

import { useActionState } from "react";
import { mergePeople, type MergeFormState } from "@/app/actions/people";
import { ConfirmSubmit } from "./confirm-submit";

const select =
  "w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink outline-none transition-colors hover:border-line-strong focus:border-ink";

/** For a group's owners and admins: two entries that are really one person. */
export function MergePeople({
  groupId,
  people,
}: {
  groupId: string;
  people: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState<MergeFormState, FormData>(mergePeople, {});

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="groupId" value={groupId} />
      <select name="firstId" aria-label="First person" required defaultValue="" className={select}>
        <option value="" disabled>
          Choose a person
        </option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.label}
          </option>
        ))}
      </select>
      <select name="secondId" aria-label="Second person" required defaultValue="" className={select}>
        <option value="" disabled>
          …is the same as
        </option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.label}
          </option>
        ))}
      </select>

      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <ConfirmSubmit
        message="Merge these two into one person? Their occasions move together, and this can't be undone."
        className="w-full rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-sunken disabled:opacity-60"
      >
        {pending ? "Merging…" : "Merge"}
      </ConfirmSubmit>
    </form>
  );
}
