"use client";

import { useActionState, useMemo, useState } from "react";
import { createEvent, type EventFormState } from "@/app/actions/events";
import {
  daysInHijriMonth,
  formatGregorian,
  formatHijri,
  fromISODate,
  gregorianToHijri,
  hijriToGregorian,
  HIJRI_MONTHS_LONG,
} from "@/lib/hijri/hijri";
import type { GroupType } from "@/generated/prisma";
import {
  EVENT_TYPE_EMOJI,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ORDER,
  GROUP_TYPE_EMOJI,
} from "@/lib/occasions/labels";

const field =
  "w-full rounded-lg border border-line bg-raised px-3 py-2 text-ink outline-none transition-colors placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20";
const labelClass = "mb-1.5 block text-sm font-medium text-ink";

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
}: {
  groups: GroupOption[];
  defaultGroupId: string;
}) {
  const [state, formAction, pending] = useActionState<EventFormState, FormData>(
    createEvent,
    {},
  );

  const [groupId, setGroupId] = useState(defaultGroupId);
  const group = groups.find((candidate) => candidate.id === groupId) ?? groups[0];
  const people = group.people;

  const [enteredCalendar, setEnteredCalendar] = useState<"GREGORIAN" | "HIJRI">(
    "GREGORIAN",
  );
  const [observedCalendar, setObservedCalendar] = useState<
    "GREGORIAN" | "HIJRI"
  >("GREGORIAN");

  const [gregorianDate, setGregorianDate] = useState("");
  const [afterSunset, setAfterSunset] = useState(false);

  const [hijriDay, setHijriDay] = useState("");
  const [hijriMonth, setHijriMonth] = useState("0");
  const [hijriYear, setHijriYear] = useState("");

  // The same conversion the server will run, previewed as you type. Safe to do
  // client-side because the library is pure arithmetic with no Node imports.
  const preview = useMemo(() => {
    try {
      if (enteredCalendar === "GREGORIAN") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(gregorianDate)) return null;
        const gregorian = fromISODate(gregorianDate);
        return {
          gregorian,
          hijri: gregorianToHijri(gregorian, { afterSunset }),
        };
      }

      const year = Number(hijriYear);
      const month = Number(hijriMonth);
      const day = Number(hijriDay);
      if (!year || !day || Number.isNaN(month)) return null;
      if (day > daysInHijriMonth(year, month)) return null;

      const hijri = { year, month, day };
      return { gregorian: hijriToGregorian(hijri), hijri };
    } catch {
      return null;
    }
  }, [enteredCalendar, gregorianDate, afterSunset, hijriDay, hijriMonth, hijriYear]);

  const hijriDayLimit = hijriYear
    ? daysInHijriMonth(Number(hijriYear), Number(hijriMonth))
    : 30;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="enteredCalendar" value={enteredCalendar} />
      <input type="hidden" name="observedCalendar" value={observedCalendar} />

      {/* ---------------------------------------------------------------- */}
      <section className="space-y-4">
        {groups.length > 1 ? (
          <div>
            <label htmlFor="groupId" className={labelClass}>
              Which group?
            </label>
            <select
              id="groupId"
              name="groupId"
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className={field}
            >
              {groups.map((option) => (
                <option key={option.id} value={option.id}>
                  {GROUP_TYPE_EMOJI[option.type]}  {option.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-faint">
              Only this group will see the occasion.
            </p>
          </div>
        ) : (
          <input type="hidden" name="groupId" value={groupId} />
        )}

        <div>
          <label htmlFor="title" className={labelClass}>
            What is the occasion?
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={120}
            className={field}
            placeholder="Taha's birthday"
          />
        </div>

        <div>
          <label htmlFor="type" className={labelClass}>
            Type
          </label>
          <select id="type" name="type" defaultValue="BIRTHDAY" className={field}>
            {EVENT_TYPE_ORDER.map((type) => (
              <option key={type} value={type}>
                {EVENT_TYPE_EMOJI[type]}  {EVENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="rounded-xl border border-line bg-raised p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">When did it happen?</h2>
          <Toggle
            options={[
              { value: "GREGORIAN", label: "Gregorian date" },
              { value: "HIJRI", label: "Hijri date" },
            ]}
            value={enteredCalendar}
            onChange={(value) =>
              setEnteredCalendar(value as "GREGORIAN" | "HIJRI")
            }
          />
        </div>

        {enteredCalendar === "GREGORIAN" ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="gregorianDate" className={labelClass}>
                Date
              </label>
              <input
                id="gregorianDate"
                name="gregorianDate"
                type="date"
                required
                value={gregorianDate}
                onChange={(event) => setGregorianDate(event.target.value)}
                className={`${field} tnum`}
              />
            </div>

            {/* The sunset question — the Islamic day turns over at Maghrib. */}
            <fieldset>
              <legend className={labelClass}>Was it before or after sunset?</legend>
              <p className="mb-2 text-xs text-muted">
                The Islamic day begins at Maghrib, so an occasion after sunset
                falls on the <em>next</em> Hijri date.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <RadioCard
                  name="sunset"
                  checked={!afterSunset}
                  onChange={() => setAfterSunset(false)}
                  title="Before sunset"
                  hint="Daytime, up to Maghrib"
                />
                <RadioCard
                  name="sunset"
                  checked={afterSunset}
                  onChange={() => setAfterSunset(true)}
                  title="After sunset"
                  hint="Evening, after Maghrib"
                />
              </div>
              {/* Mirrors the radio state into the submitted form data. */}
              <input
                type="hidden"
                name="afterSunset"
                value={afterSunset ? "on" : "off"}
              />
            </fieldset>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[6rem_1fr_7rem]">
            <div>
              <label htmlFor="hijriDay" className={labelClass}>
                Day
              </label>
              <input
                id="hijriDay"
                name="hijriDay"
                type="number"
                min={1}
                max={hijriDayLimit}
                required
                value={hijriDay}
                onChange={(event) => setHijriDay(event.target.value)}
                className={`${field} tnum`}
                placeholder="17"
              />
            </div>
            <div>
              <label htmlFor="hijriMonth" className={labelClass}>
                Month
              </label>
              <select
                id="hijriMonth"
                name="hijriMonth"
                value={hijriMonth}
                onChange={(event) => setHijriMonth(event.target.value)}
                className={field}
              >
                {HIJRI_MONTHS_LONG.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="hijriYear" className={labelClass}>
                Year AH
              </label>
              <input
                id="hijriYear"
                name="hijriYear"
                type="number"
                min={1000}
                max={1600}
                required
                value={hijriYear}
                onChange={(event) => setHijriYear(event.target.value)}
                className={`${field} tnum`}
                placeholder="1429"
              />
            </div>
          </div>
        )}

        <DatePreview preview={preview} entered={enteredCalendar} />
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="rounded-xl border border-line bg-raised p-4">
        <h2 className={labelClass}>Which calendar does the family observe it by?</h2>
        <p className="mb-2.5 text-xs text-muted">
          A Gregorian birthday returns to the same date every year. A Hijri one
          moves about eleven days earlier each Gregorian year.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <RadioCard
            name="observed"
            checked={observedCalendar === "GREGORIAN"}
            onChange={() => setObservedCalendar("GREGORIAN")}
            title="Gregorian"
            hint={
              preview
                ? `Every ${formatGregorian(preview.gregorian).split(" ").slice(0, 2).join(" ")}`
                : "Same date each year"
            }
          />
          <RadioCard
            name="observed"
            checked={observedCalendar === "HIJRI"}
            onChange={() => setObservedCalendar("HIJRI")}
            title="Hijri"
            hint={
              preview
                ? `Every ${formatHijri(preview.hijri).split(" ").slice(0, 2).join(" ")}`
                : "Same Hijri date each year"
            }
          />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="space-y-4">
        <div>
          <span className={labelClass}>Who is it for?</span>
          {people.length > 0 && (
            // Keyed on the group so switching groups clears the ticks rather
            // than letting React reuse them by position.
            <div key={groupId} className="mb-2.5 flex flex-wrap gap-1.5">
              {people.map((person) => (
                <label
                  key={person.id}
                  className="cursor-pointer rounded-full border border-line bg-raised px-3 py-1 text-sm text-muted transition-colors has-checked:border-accent has-checked:bg-accent-soft has-checked:text-accent-text"
                >
                  <input
                    type="checkbox"
                    name="personIds"
                    value={person.id}
                    className="sr-only"
                  />
                  {person.name}
                </label>
              ))}
            </div>
          )}
          <input
            name="newPeople"
            className={field}
            placeholder={
              people.length > 0
                ? "Or add new names, separated by commas"
                : "Names, separated by commas — e.g. Taha, Fatema"
            }
          />
          <p className="mt-1.5 text-xs text-faint">
            An anniversary can name two people.
          </p>
        </div>

        <div>
          <label htmlFor="notes" className={labelClass}>
            Notes <span className="font-normal text-faint">(optional)</span>
          </label>
          <textarea id="notes" name="notes" rows={2} maxLength={1000} className={field} />
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="recurring"
            defaultChecked
            className="mt-0.5 size-4 accent-[var(--accent)]"
          />
          <span>
            <span className="font-medium text-ink">Comes round every year</span>
            <span className="block text-xs text-muted">
              Uncheck for a one-off you just want on the record.
            </span>
          </span>
        </label>
      </section>

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
        {pending ? "Adding…" : "Add to the family list"}
      </button>
    </form>
  );
}

/** Shows both calendar dates as soon as enough has been entered to convert. */
function DatePreview({
  preview,
  entered,
}: {
  preview: {
    gregorian: { year: number; month: number; day: number };
    hijri: { year: number; month: number; day: number };
  } | null;
  entered: "GREGORIAN" | "HIJRI";
}) {
  if (!preview) {
    return (
      <p className="mt-4 rounded-lg bg-sunken px-3 py-2.5 text-xs text-faint">
        Both dates will appear here once you enter one.
      </p>
    );
  }

  const derived = entered === "GREGORIAN" ? "Hijri" : "Gregorian";

  return (
    <div className="tnum mt-4 rounded-lg bg-sunken px-3 py-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
        <span className="text-ink">{formatGregorian(preview.gregorian, "long")}</span>
        <span className="text-faint" aria-hidden="true">
          ·
        </span>
        <span className="font-medium text-accent-text">
          {formatHijri(preview.hijri, "long")}
        </span>
      </div>
      <p className="mt-1 text-xs text-faint">
        {derived} date worked out for you — check it looks right.
      </p>
    </div>
  );
}

function RadioCard({
  name,
  checked,
  onChange,
  title,
  hint,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={`cursor-pointer rounded-lg border px-3 py-2.5 transition-colors ${
        checked
          ? "border-accent bg-accent-soft"
          : "border-line bg-raised hover:border-line-strong"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className={`block text-sm font-medium ${checked ? "text-accent-text" : "text-ink"}`}
      >
        {title}
      </span>
      <span className="block text-xs text-muted">{hint}</span>
    </label>
  );
}

function Toggle({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-sunken p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === option.value
              ? "bg-raised text-ink shadow-sm"
              : "text-muted hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
