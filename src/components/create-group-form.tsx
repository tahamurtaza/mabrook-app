"use client";

import { useActionState } from "react";
import { createGroup, type GroupFormState } from "@/app/actions/groups";
import {
  GROUP_TYPE_EMOJI,
  GROUP_TYPE_LABELS,
  GROUP_TYPE_ORDER,
} from "@/lib/occasions/labels";

const field =
  "w-full rounded-lg border border-line bg-raised px-3 py-2 text-ink outline-none transition-colors placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20";

export function CreateGroupForm() {
  const [state, formAction, pending] = useActionState<GroupFormState, FormData>(
    createGroup,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <div>
          <label htmlFor="group-name" className="mb-1.5 block text-sm font-medium">
            Group name
          </label>
          <input
            id="group-name"
            name="name"
            required
            maxLength={80}
            className={field}
            placeholder="The Bombaywalas"
          />
        </div>
        <div>
          <label htmlFor="group-type" className="mb-1.5 block text-sm font-medium">
            Kind
          </label>
          <select id="group-type" name="type" defaultValue="FAMILY" className={field}>
            {GROUP_TYPE_ORDER.map((type) => (
              <option key={type} value={type}>
                {GROUP_TYPE_EMOJI[type]}  {GROUP_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create group"}
      </button>
    </form>
  );
}
