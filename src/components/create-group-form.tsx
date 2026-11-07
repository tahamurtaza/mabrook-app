"use client";

import { useActionState } from "react";
import { createGroup, type GroupFormState } from "@/app/actions/groups";
import {
  GROUP_TYPE_EMOJI,
  GROUP_TYPE_LABELS,
  GROUP_TYPE_ORDER,
} from "@/lib/occasions/labels";
import { fieldClass, labelClass, primaryButton } from "./form-styles";

export function CreateGroupForm() {
  const [state, formAction, pending] = useActionState<GroupFormState, FormData>(
    createGroup,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="group-name" className={labelClass}>
          Name
        </label>
        <input
          id="group-name"
          name="name"
          required
          maxLength={80}
          className={fieldClass}
          placeholder="The Kapadias"
        />
      </div>

      <fieldset>
        <legend className={labelClass}>Kind</legend>
        <div className="flex flex-wrap gap-1.5">
          {GROUP_TYPE_ORDER.map((type) => (
            <label
              key={type}
              className="cursor-pointer rounded-full border border-line px-2.5 py-1 text-sm text-muted transition-colors hover:border-line-strong has-checked:border-ink has-checked:bg-ink has-checked:text-paper"
            >
              <input
                type="radio"
                name="type"
                value={type}
                defaultChecked={type === "FAMILY"}
                className="sr-only"
              />
              <span aria-hidden="true" className="mr-1">
                {GROUP_TYPE_EMOJI[type]}
              </span>
              {GROUP_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
        {pending ? "Creating…" : "Create group"}
      </button>
    </form>
  );
}
