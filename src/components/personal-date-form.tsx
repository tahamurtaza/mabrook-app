"use client";

import { useActionState, useId, useState } from "react";
import {
  addPersonalDate,
  updatePersonalDate,
  type PersonalDateFormState,
} from "@/app/actions/personal-dates";
import type { EventType, PersonalDate } from "@/generated/prisma";
import { formatGregorian, formatHijri, toISODate } from "@/lib/hijri/hijri";
import {
  EVENT_TYPE_EMOJI,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ORDER,
} from "@/lib/occasions/labels";
import { DateFields, EnteredCalendarToggle, KeptByChoice, useDateEntry } from "./date-entry";
import { fieldClass, labelClass, primaryButton } from "./form-styles";

/**
 * Add one of your own dates, or change one given as `date`. The page re-keys it
 * after each save, which clears it.
 */
export function PersonalDateForm({
  date,
  hasBirthday,
  submitLabel = date ? "Save changes" : "Save this date",
}: {
  date?: PersonalDate;
  hasBirthday: boolean;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<PersonalDateFormState, FormData>(
    date ? updatePersonalDate : addPersonalDate,
    {},
  );
  const [type, setType] = useState<EventType>(
    date?.type ?? (hasBirthday ? "ANNIVERSARY" : "BIRTHDAY"),
  );
  const entry = useDateEntry(
    date && {
      enteredCalendar: date.enteredCalendar,
      observedCalendar: date.observedCalendar,
      afterSunset: date.afterSunset,
      gregorianDate: toISODate({
        year: date.gregorianYear,
        month: date.gregorianMonth,
        day: date.gregorianDay,
      }),
      hijri: { year: date.hijriYear, month: date.hijriMonth, day: date.hijriDay },
    },
  );
  const { preview } = entry;
  const labelId = useId();

  // Someone only has the one birthday, though the one they have stays editable.
  const types = EVENT_TYPE_ORDER.filter(
    (option) => !(option === "BIRTHDAY" && hasBirthday && date?.type !== "BIRTHDAY"),
  );

  return (
    <form action={formAction} className="space-y-5">
      {date && <input type="hidden" name="id" value={date.id} />}

      <fieldset>
        <legend className={labelClass}>What is it?</legend>
        <div className="flex flex-wrap gap-1.5">
          {types.map((option) => (
            <label
              key={option}
              className="cursor-pointer rounded-full border border-line px-3 py-1 text-sm text-muted transition-colors hover:border-line-strong has-checked:border-ink has-checked:bg-ink has-checked:text-paper"
            >
              <input
                type="radio"
                name="type"
                value={option}
                checked={type === option}
                onChange={() => setType(option)}
                className="sr-only"
              />
              <span aria-hidden="true" className="mr-1.5">
                {EVENT_TYPE_EMOJI[option]}
              </span>
              {option === "OTHER" ? "Something else" : EVENT_TYPE_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>

      {type === "OTHER" && (
        <div>
          <label htmlFor={labelId} className={labelClass}>
            What would you call it?
          </label>
          <input
            id={labelId}
            name="label"
            required
            maxLength={80}
            defaultValue={date?.label ?? ""}
            className={fieldClass}
            placeholder="Our first home"
          />
        </div>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-ink">When?</span>
          <EnteredCalendarToggle entry={entry} />
        </div>
        <DateFields entry={entry} />
      </div>

      {preview && (
        <p className="tnum rounded-lg bg-sunken px-3 py-2 text-sm">
          <span className="font-medium text-greg">{formatGregorian(preview.gregorian, "long")}</span>
          <span className="text-faint"> · </span>
          <span className="font-medium text-hijri">{formatHijri(preview.hijri, "long")}</span>
        </p>
      )}

      <div>
        <p className={labelClass}>Which calendar do you keep it by?</p>
        <KeptByChoice entry={entry} />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

/** A date with an Edit button that opens its form underneath. */
export function EditableDate({
  date,
  hasBirthday,
  summary,
  actions,
}: {
  date: PersonalDate;
  hasBirthday: boolean;
  summary: React.ReactNode;
  actions: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        {summary}
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            aria-expanded={editing}
            onClick={() => setEditing(!editing)}
            className="rounded-md px-2 py-1 text-xs font-medium text-ink transition-colors hover:bg-sunken"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
          {actions}
        </div>
      </div>

      {editing && (
        <div className="mt-3 rounded-xl border border-line bg-surface p-4 sm:p-5">
          <PersonalDateForm date={date} hasBirthday={hasBirthday} />
        </div>
      )}
    </>
  );
}
