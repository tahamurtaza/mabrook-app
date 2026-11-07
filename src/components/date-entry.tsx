"use client";

import { useId, useMemo, useState } from "react";
import {
  addDays,
  dayOfWeek,
  daysInHijriMonth,
  formatGregorian,
  GREGORIAN_MONTHS,
  hijriToGregorian,
  HIJRI_MONTHS_LONG,
  HIJRI_MONTHS_SHORT,
} from "@/lib/hijri/hijri";
import { deriveDates } from "@/lib/occasions/derive";
import type { ObservedCalendar } from "@/lib/occasions/occurrence";
import { fieldClass, labelClass } from "./form-styles";
import { SunsetIcon } from "./icons";

/**
 * Entering a date, in either calendar. Used by every form that takes one, so
 * an occasion and someone's own birthday are asked for in exactly the same way
 * and post the same fields (see `lib/occasions/date-entry.ts`).
 */

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** What a form starts from: a date from the calendar, or one being edited. */
export interface DateEntryStart {
  enteredCalendar?: "GREGORIAN" | "HIJRI";
  observedCalendar?: ObservedCalendar;
  gregorianDate?: string;
  afterSunset?: boolean;
  hijri?: { year: number; month: number; day: number };
}

export function useDateEntry(start: DateEntryStart = {}) {
  const [enteredCalendar, setEnteredCalendar] = useState(start.enteredCalendar ?? "GREGORIAN");
  const [observedCalendar, setObservedCalendar] = useState<ObservedCalendar>(
    start.observedCalendar ?? "GREGORIAN",
  );

  const [gregorianDate, setGregorianDate] = useState(start.gregorianDate ?? "");
  const [afterSunset, setAfterSunset] = useState(start.afterSunset ?? false);

  const [hijriDay, setHijriDay] = useState(start.hijri ? String(start.hijri.day) : "");
  const [hijriMonth, setHijriMonth] = useState(String(start.hijri?.month ?? 0));
  const [hijriYear, setHijriYear] = useState(start.hijri ? String(start.hijri.year) : "");

  // The same conversion the server will run, previewed as you type. Safe to do
  // client-side because the library is pure arithmetic with no Node imports.
  // Literally the function the server runs, so the preview can't disagree
  // with what gets stored.
  const preview = useMemo(() => {
    try {
      if (enteredCalendar === "GREGORIAN") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(gregorianDate)) return null;
        return deriveDates({ enteredCalendar, gregorianDate, afterSunset });
      }

      const year = Number(hijriYear);
      const month = Number(hijriMonth);
      const day = Number(hijriDay);
      if (!year || !day || Number.isNaN(month)) return null;
      if (day > daysInHijriMonth(year, month)) return null;

      return deriveDates({ enteredCalendar, hijri: { year, month, day }, afterSunset });
    } catch {
      return null;
    }
  }, [enteredCalendar, gregorianDate, afterSunset, hijriDay, hijriMonth, hijriYear]);

  function switchCalendar(next: "GREGORIAN" | "HIJRI") {
    // Someone entering a Hijri date almost always keeps it by Hijri; follow
    // along unless they've already picked something else.
    if (observedCalendar === enteredCalendar) setObservedCalendar(next);
    setEnteredCalendar(next);
  }

  return {
    enteredCalendar,
    switchCalendar,
    observedCalendar,
    setObservedCalendar,
    gregorianDate,
    setGregorianDate,
    afterSunset,
    setAfterSunset,
    hijriDay,
    setHijriDay,
    hijriMonth,
    setHijriMonth,
    hijriYear,
    setHijriYear,
    preview,
  };
}

export type DateEntry = ReturnType<typeof useDateEntry>;

/** Which calendar the date is being typed in. */
export function EnteredCalendarToggle({ entry }: { entry: DateEntry }) {
  return (
    <Segmented
      label="Enter the date in"
      value={entry.enteredCalendar}
      onChange={(value) => entry.switchCalendar(value as "GREGORIAN" | "HIJRI")}
      options={[
        { value: "GREGORIAN", label: "Gregorian", tone: "text-greg" },
        { value: "HIJRI", label: "Hijri", tone: "text-hijri" },
      ]}
    />
  );
}

/** The date itself, and the question of which side of Maghrib it fell. */
export function DateFields({ entry }: { entry: DateEntry }) {
  const {
    enteredCalendar,
    gregorianDate,
    setGregorianDate,
    afterSunset,
    setAfterSunset,
    hijriDay,
    setHijriDay,
    hijriMonth,
    setHijriMonth,
    hijriYear,
    setHijriYear,
  } = entry;

  // Several of these can be open on one page, as on Settings.
  const id = useId();

  const hijriDayLimit = hijriYear
    ? daysInHijriMonth(Number(hijriYear), Number(hijriMonth))
    : 30;

  // For a Hijri entry, the two Gregorian dates its day spans: the evening it
  // begins and the daytime that follows.
  const hijriSpan = useMemo(() => {
    if (enteredCalendar !== "HIJRI") return null;
    const year = Number(hijriYear);
    const month = Number(hijriMonth);
    const day = Number(hijriDay);
    if (!year || !day || day > daysInHijriMonth(year, month)) return null;
    const daytime = hijriToGregorian({ year, month, day });
    return { evening: addDays(daytime, -1), daytime };
  }, [enteredCalendar, hijriYear, hijriMonth, hijriDay]);

  return (
    <>
      <input type="hidden" name="enteredCalendar" value={enteredCalendar} />
      <input type="hidden" name="observedCalendar" value={entry.observedCalendar} />

    {enteredCalendar === "GREGORIAN" ? (
      <div className="sm:max-w-[14rem]">
        <label htmlFor={`${id}-gregorianDate`} className={labelClass}>
          Date
        </label>
        <input
          id={`${id}-gregorianDate`}
          name="gregorianDate"
          type="date"
          required
          value={gregorianDate}
          onChange={(event) => setGregorianDate(event.target.value)}
          className={`${fieldClass} tnum`}
        />
      </div>
    ) : (
      <div className="grid grid-cols-[5rem_minmax(0,1fr)_6rem] gap-3">
        <div>
          <label htmlFor={`${id}-hijriDay`} className={labelClass}>
            Day
          </label>
          <input
            id={`${id}-hijriDay`}
            name="hijriDay"
            type="number"
            min={1}
            max={hijriDayLimit}
            required
            value={hijriDay}
            onChange={(event) => setHijriDay(event.target.value)}
            className={`${fieldClass} tnum`}
            placeholder="17"
          />
        </div>
        <div>
          <label htmlFor={`${id}-hijriMonth`} className={labelClass}>
            Month
          </label>
          <select
            id={`${id}-hijriMonth`}
            name="hijriMonth"
            value={hijriMonth}
            onChange={(event) => setHijriMonth(event.target.value)}
            className={fieldClass}
          >
            {HIJRI_MONTHS_LONG.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-hijriYear`} className={labelClass}>
            Year AH
          </label>
          <input
            id={`${id}-hijriYear`}
            name="hijriYear"
            type="number"
            min={1000}
            max={1600}
            required
            value={hijriYear}
            onChange={(event) => setHijriYear(event.target.value)}
            className={`${fieldClass} tnum`}
            placeholder="1429"
          />
        </div>
      </div>
    )}

    {/*
      The time-of-day question, asked whichever calendar the date is in.
      The Islamic day turns over at Maghrib, so one Hijri day spans two
      Gregorian dates and one Gregorian date spans two Hijri days.
    */}
    <fieldset className="mt-5">
      <legend className={`${labelClass} flex items-center gap-1.5`}>
        <SunsetIcon className="size-4 text-muted" />
        {enteredCalendar === "GREGORIAN"
          ? "Before or after sunset?"
          : "Which part of the Hijri day?"}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {(enteredCalendar === "GREGORIAN"
          ? [
              {
                value: false,
                title: "Before Maghrib",
                hint: "Daytime, or the small hours after midnight",
              },
              {
                value: true,
                title: "After Maghrib",
                hint: "The evening — the next Hijri date has begun",
              },
            ]
          : [
              {
                value: false,
                title: "Daytime, or after midnight",
                hint: hijriSpan
                  ? `${WEEKDAYS[dayOfWeek(hijriSpan.daytime)]} ${formatGregorian(hijriSpan.daytime)}`
                  : "From midnight until Maghrib",
              },
              {
                value: true,
                title: "The night before, until midnight",
                hint: hijriSpan
                  ? `Evening of ${WEEKDAYS[dayOfWeek(hijriSpan.evening)]} ${formatGregorian(hijriSpan.evening)}`
                  : "From Maghrib until midnight",
              },
            ]
        ).map((option) => (
          <label
            key={option.title}
            className={`cursor-pointer rounded-lg border px-3.5 py-2.5 transition-colors ${
              afterSunset === option.value
                ? "border-ink bg-surface"
                : "border-line hover:border-line-strong"
            }`}
          >
            <input
              type="radio"
              name="sunset"
              checked={afterSunset === option.value}
              onChange={() => setAfterSunset(option.value)}
              className="sr-only"
            />
            <span className="block text-sm font-medium text-ink">{option.title}</span>
            <span className="tnum block text-xs text-muted">{option.hint}</span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        {enteredCalendar === "GREGORIAN" ? (
          <>
            The Islamic day begins at Maghrib, so something in the evening falls on the{" "}
            <em>next</em> Hijri date.
          </>
        ) : (
          <>
            A Hijri day begins at Maghrib the evening before. Something that night,
            before midnight, has the <em>earlier</em> English date.
          </>
        )}
      </p>
    </fieldset>
    {/* Mirrors the radio state into the submitted form data. */}
    <input type="hidden" name="afterSunset" value={afterSunset ? "on" : "off"} />
    </>
  );
}

/** Which calendar it comes round by, spelt out in actual dates once known. */
export function KeptByChoice({ entry }: { entry: DateEntry }) {
  const { observedCalendar, setObservedCalendar, preview } = entry;

  const everyGregorian = preview
    ? `${preview.gregorian.day} ${GREGORIAN_MONTHS[preview.gregorian.month - 1]}`
    : null;
  const everyHijri = preview
    ? `${preview.hijri.day} ${HIJRI_MONTHS_SHORT[preview.hijri.month]}`
    : null;

  return (
      <div className="grid gap-2 sm:grid-cols-3">
        <Choice
          checked={observedCalendar === "GREGORIAN"}
          onChange={() => setObservedCalendar("GREGORIAN")}
          title="Gregorian"
          tone="greg"
          hint={everyGregorian ? `Every ${everyGregorian}` : "Same date every year"}
        />
        <Choice
          checked={observedCalendar === "HIJRI"}
          onChange={() => setObservedCalendar("HIJRI")}
          title="Hijri"
          tone="hijri"
          hint={everyHijri ? `Every ${everyHijri}` : "About 11 days earlier each year"}
        />
        <Choice
          checked={observedCalendar === "BOTH"}
          onChange={() => setObservedCalendar("BOTH")}
          title="Both"
          tone="both"
          hint={
            everyGregorian && everyHijri
              ? `${everyGregorian} and ${everyHijri}`
              : "Twice a year, once on each"
          }
        />
      </div>
  );
}

function Choice({
  checked,
  onChange,
  title,
  hint,
  tone,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  hint: string;
  tone: "greg" | "hijri" | "both";
}) {
  const dots = tone === "both" ? ["bg-greg", "bg-hijri"] : [tone === "greg" ? "bg-greg" : "bg-hijri"];
  return (
    <label
      className={`cursor-pointer rounded-lg border px-3.5 py-3 transition-colors ${
        checked ? "border-ink bg-surface" : "border-line hover:border-line-strong"
      }`}
    >
      <input
        type="radio"
        name="observed"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className="flex items-center gap-2 text-sm font-medium text-ink">
        <span aria-hidden="true" className="flex gap-0.5">
          {dots.map((colour) => (
            <span key={colour} className={`size-2 rounded-full ${colour}`} />
          ))}
        </span>
        {title}
      </span>
      <span className="tnum mt-0.5 block text-xs text-muted">{hint}</span>
    </label>
  );
}

function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; tone: string }[];
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg bg-sunken p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-3 py-1 text-sm transition-colors ${
            value === option.value
              ? `bg-surface font-medium shadow-sm ${option.tone}`
              : "text-muted hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
