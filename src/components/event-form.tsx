"use client";

import { useActionState, useMemo, useState } from "react";
import { createEvent, type EventFormState } from "@/app/actions/events";
import type { EventType, GroupType } from "@/generated/prisma";
import {
  addDays,
  dayOfWeek,
  formatGregorian,
  formatHijri,
  type GregorianDate,
} from "@/lib/hijri/hijri";
import {
  describeYears,
  EVENT_TYPE_EMOJI,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ORDER,
  GROUP_TYPE_EMOJI,
} from "@/lib/occasions/labels";
import { occurrencesBetween } from "@/lib/occasions/occurrence";
import {
  DateFields,
  EnteredCalendarToggle,
  KeptByChoice,
  useDateEntry,
  WEEKDAYS,
} from "./date-entry";
import { fieldClass, labelClass, primaryButton } from "./form-styles";

export interface PersonOption {
  id: string;
  name: string;
}

export interface GroupOption {
  id: string;
  name: string;
  type: GroupType;
  people: PersonOption[];
}

export function EventForm({
  groups,
  defaultGroupId,
  defaultDate,
  today,
}: {
  groups: GroupOption[];
  defaultGroupId: string;
  /** ISO date to start from, e.g. when adding from a day on the calendar. */
  defaultDate?: string;
  today: GregorianDate;
}) {
  const [state, formAction, pending] = useActionState<EventFormState, FormData>(
    createEvent,
    {},
  );

  // An occasion can be shared with several groups at once — a wedding the
  // family and the cricket team should both be reminded of.
  const [groupIds, setGroupIds] = useState<string[]>([defaultGroupId]);
  const [names, setNames] = useState<string[]>([]);

  // Everyone on the chosen groups' lists, once per name. The same person is a
  // separate row in each group, so they're picked by name and matched against
  // each group's list when saved.
  const people = useMemo(() => {
    const byName = new Map<string, string>();
    for (const group of groups) {
      if (!groupIds.includes(group.id)) continue;
      for (const person of group.people) {
        if (!byName.has(person.name.toLowerCase())) byName.set(person.name.toLowerCase(), person.name);
      }
    }
    // Keep anyone already ticked, even if their group was just unticked.
    for (const name of names) {
      if (!byName.has(name.toLowerCase())) byName.set(name.toLowerCase(), name);
    }
    return [...byName.values()].sort((a, b) => a.localeCompare(b));
  }, [groups, groupIds, names]);

  function toggleGroup(id: string) {
    setGroupIds((current) =>
      current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id],
    );
  }

  function toggleName(name: string) {
    setNames((current) =>
      current.includes(name) ? current.filter((candidate) => candidate !== name) : [...current, name],
    );
  }

  const [type, setType] = useState<EventType>("BIRTHDAY");
  const [recurring, setRecurring] = useState(true);

  const entry = useDateEntry({ gregorianDate: defaultDate });
  const { enteredCalendar, observedCalendar, afterSunset, preview } = entry;

  // When it will come round, computed by the same recurrence rules the lists use.
  const turns = useMemo(() => {
    if (!preview) return [];
    const occasion = {
      observedCalendar,
      recurring,
      gregorianYear: preview.gregorian.year,
      gregorianMonth: preview.gregorian.month,
      gregorianDay: preview.gregorian.day,
      hijriYear: preview.hijri.year,
      hijriMonth: preview.hijri.month,
      hijriDay: preview.hijri.day,
    };
    return occurrencesBetween(occasion, today, addDays(today, 800)).slice(0, 3);
  }, [preview, observedCalendar, recurring, today]);

  return (
    <form
      action={formAction}
      className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div className="min-w-0 space-y-9">
        {/* ---------------------------------------------------------------- */}
        <Step number={1} title="What is it?">
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="sr-only">
                Title
              </label>
              <input
                id="title"
                name="title"
                required
                maxLength={120}
                className={`${fieldClass} text-lg`}
                placeholder="Yusuf's birthday"
              />
            </div>

            <fieldset>
              <legend className="sr-only">Type</legend>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPE_ORDER.map((option) => (
                  <label
                    key={option}
                    className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:border-line-strong has-checked:border-ink has-checked:bg-ink has-checked:text-paper"
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
                    {EVENT_TYPE_LABELS[option]}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </Step>

        {/* ---------------------------------------------------------------- */}
        <Step
          number={2}
          title="When did it happen?"
          aside={
            <EnteredCalendarToggle entry={entry} />
          }
        >
          <DateFields entry={entry} />
        </Step>

        {/* ---------------------------------------------------------------- */}
        <Step number={3} title="Which calendar is it kept by?">
          <KeptByChoice entry={entry} />

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              name="recurring"
              checked={recurring}
              onChange={(event) => setRecurring(event.target.checked)}
              className="mt-0.5 size-4 accent-[var(--ink)]"
            />
            <span>
              <span className="font-medium text-ink">Comes round every year</span>
              <span className="block text-xs text-muted">
                Untick for a one-off you just want on the record.
              </span>
            </span>
          </label>
        </Step>

        {/* ---------------------------------------------------------------- */}
        <Step number={4} title="Who and where?">
          <div className="space-y-4">
            <fieldset>
              <legend className={labelClass}>
                {groups.length > 1 ? "Share with" : "Group"}
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {groups.map((option) => {
                  const checked = groupIds.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        checked
                          ? "border-ink bg-surface font-medium text-ink"
                          : "border-line text-muted hover:border-line-strong"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="groupIds"
                        value={option.id}
                        checked={checked}
                        onChange={() => toggleGroup(option.id)}
                        className="size-3.5 accent-[var(--ink)]"
                      />
                      <span aria-hidden="true">{GROUP_TYPE_EMOJI[option.type]}</span>
                      {option.name}
                    </label>
                  );
                })}
                {groups.length > 2 && (
                  <button
                    type="button"
                    onClick={() =>
                      setGroupIds(
                        groupIds.length === groups.length ? [defaultGroupId] : groups.map((g) => g.id),
                      )
                    }
                    className="rounded-lg px-2.5 py-2 text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
                  >
                    {groupIds.length === groups.length ? "Just one" : "All groups"}
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-faint">
                {groupIds.length === 0
                  ? "Pick at least one group."
                  : groupIds.length === 1
                    ? "Only this group will see the occasion."
                    : `All ${groupIds.length} groups will see it. Each keeps its own copy.`}
              </p>
            </fieldset>

            <div>
              <span className={labelClass}>People</span>
              {people.length > 0 && (
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {people.map((name) => (
                    <label
                      key={name}
                      className="cursor-pointer rounded-full border border-line px-3 py-1 text-sm text-muted transition-colors hover:border-line-strong has-checked:border-ink has-checked:bg-ink has-checked:text-paper"
                    >
                      <input
                        type="checkbox"
                        name="personNames"
                        value={name}
                        checked={names.includes(name)}
                        onChange={() => toggleName(name)}
                        className="sr-only"
                      />
                      {name}
                    </label>
                  ))}
                </div>
              )}
              <input
                name="newPeople"
                aria-label="New people"
                className={fieldClass}
                placeholder={
                  people.length > 0
                    ? "Or add new people by full name, separated by commas"
                    : "Full names, separated by commas — e.g. Rashida Kapadia, Yusuf Kapadia"
                }
              />
              <p className="mt-1.5 text-xs text-faint">
                An anniversary can name two people.
                {groupIds.length > 1 && " Anyone missing from a group's list is added to it."}
              </p>
            </div>

            <div>
              <label htmlFor="notes" className={labelClass}>
                Notes <span className="font-normal text-faint">(optional)</span>
              </label>
              <textarea id="notes" name="notes" rows={2} maxLength={1000} className={fieldClass} />
            </div>
          </div>
        </Step>
      </div>

      {/* ---------------------------------------------------------------- */}
      <aside className="lg:row-span-2">
        <div className="rounded-xl border border-line bg-surface p-5 lg:sticky lg:top-20">
          <p className="eyebrow text-faint">Preview</p>

          {preview ? (
            <>
              <p className="font-display tnum mt-2 text-2xl leading-tight font-medium text-ink">
                {formatGregorian(preview.gregorian, "long")}
              </p>
              <p className="tnum mt-0.5 font-medium text-hijri">
                {formatHijri(preview.hijri, "long")}
              </p>
              <p className="mt-1.5 text-xs text-faint">
                {enteredCalendar === "GREGORIAN" ? "Hijri" : "Gregorian"} date worked out for
                you — check it looks right.
                {afterSunset &&
                  (enteredCalendar === "GREGORIAN"
                    ? " After Maghrib, so it's the next Hijri date."
                    : " The night before, so it's the earlier English date.")}
              </p>

              <div className="mt-5 border-t border-line pt-4">
                <p className="eyebrow mb-2 text-faint">
                  {recurring ? "Comes round next" : "On the calendar"}
                </p>
                {turns.length === 0 ? (
                  <p className="text-sm text-muted">
                    {recurring ? "—" : "A one-off in the past — it'll be kept on the record."}
                  </p>
                ) : (
                  <ul className="tnum space-y-2.5">
                    {turns.map((turn) => {
                      const years = describeYears(type, turn);
                      return (
                        <li
                          key={`${turn.gregorian.year}-${turn.gregorian.month}-${turn.gregorian.day}`}
                          className="flex items-start justify-between gap-3 text-sm"
                        >
                          <span>
                            <span className="block text-ink">
                              {WEEKDAYS[dayOfWeek(turn.gregorian)]} {formatGregorian(turn.gregorian)}
                            </span>
                            <span className="block text-xs text-faint">
                              <span className={turn.anchor === "GREGORIAN" ? "text-greg" : "text-hijri"}>
                                {turn.anchor === "GREGORIAN" ? "Gregorian" : turn.anchor === "HIJRI" ? "Hijri" : "Both"}
                              </span>{" "}
                              · {formatHijri(turn.hijri)}
                              {years && ` · ${years}`}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-muted">
                            {turn.daysAway === 0 ? "Today" : `${turn.daysAway}d`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-faint">
              Enter a date in either calendar and both will appear here, with when it next
              comes round.
            </p>
          )}
        </div>
      </aside>

      <div className="lg:col-start-1">
        {state.error && (
          <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || groupIds.length === 0}
          className={`${primaryButton} w-full py-3 sm:w-auto sm:px-8`}
        >
          {pending
            ? "Adding…"
            : groupIds.length > 1
              ? `Add to ${groupIds.length} groups`
              : "Add occasion"}
        </button>
      </div>
    </form>
  );
}

function Step({
  number,
  title,
  aside,
  children,
}: {
  number: number;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2.5">
        <h2 className="flex items-baseline gap-2.5">
          <span className="font-display tnum text-lg text-faint">{number}</span>
          <span className="font-medium text-ink">{title}</span>
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
