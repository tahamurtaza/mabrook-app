/**
 * Works out when an occasion next comes round.
 *
 * The whole point of the app lives here: two occasions on the same list can
 * recur on two different clocks. A Gregorian birthday returns to the same 14
 * November every year. A Hijri birthday returns to the same 17 Zilqadah, which
 * lands about eleven days earlier each Gregorian year. An occasion observed by
 * both comes round twice a year, on each. To build one merged "upcoming" list
 * we project every occasion forward onto a Gregorian day.
 */

import {
  daysBetween,
  daysInHijriMonth,
  gregorianToHijri,
  hijriToGregorian,
  type GregorianDate,
  type HijriDate,
} from "@/lib/hijri/hijri";

/** Which calendar a date was typed in. */
export type CalendarSystem = "GREGORIAN" | "HIJRI";

/** Which calendar an anniversary is counted in. */
export type ObservedCalendar = CalendarSystem | "BOTH";

/** The stored shape an occurrence is computed from. */
export interface RecurringOccasion {
  observedCalendar: ObservedCalendar;
  gregorianYear: number;
  gregorianMonth: number;
  gregorianDay: number;
  hijriYear: number;
  hijriMonth: number;
  hijriDay: number;
  recurring: boolean;
}

export interface Occurrence {
  /** The Gregorian day the occasion falls on. */
  gregorian: GregorianDate;
  /** The Hijri day it falls on. */
  hijri: HijriDate;
  /** Whole days from the reference date; 0 is today, negative is past. */
  daysAway: number;
  /**
   * Why this occurrence exists — which calendar's anniversary it is. `BOTH` on
   * the roughly once-in-33-years occasions where the two land on the same day.
   */
  anchor: ObservedCalendar;
  /**
   * How many years the occasion completes in each calendar — the age on a
   * birthday. Only the anchor's count is meaningful; the other is null unless
   * the anchor is `BOTH`. Null throughout for a non-recurring occasion.
   */
  years: { gregorian: number | null; hijri: number | null };
  /**
   * True when the stored day does not exist in the target year and we had to
   * move it: 29 February in a common year, or 30 Zilhaj outside a Kabisa year.
   */
  adjusted: boolean;
}

/** Days in a Gregorian month, 1-indexed. */
function daysInGregorianMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return [1, 3, 5, 7, 8, 10, 12].includes(month) ? 31 : 30;
}

/** Compare two dates of the same calendar. Negative when `a` is earlier. */
function compareParts(
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number },
): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/**
 * Place a stored day into a target Gregorian year, pulling 29 February back to
 * the 28th in a common year so the occasion is still observed in February.
 */
function inGregorianYear(
  year: number,
  month: number,
  day: number,
): { date: GregorianDate; adjusted: boolean } {
  const limit = daysInGregorianMonth(year, month);
  return {
    date: { year, month, day: Math.min(day, limit) },
    adjusted: day > limit,
  };
}

/**
 * Place a stored day into a target Hijri year. Only 30 Zilhaj can be missing:
 * it exists in Kabisa years only, so in the other years it falls back to the
 * 29th rather than spilling into Moharram of the next year.
 */
function inHijriYear(
  year: number,
  month: number,
  day: number,
): { date: HijriDate; adjusted: boolean } {
  const limit = daysInHijriMonth(year, month);
  return {
    date: { year, month, day: Math.min(day, limit) },
    adjusted: day > limit,
  };
}

/** The next turn of one anchor, ignoring any other the occasion may have. */
function nextForAnchor(
  occasion: RecurringOccasion,
  from: GregorianDate,
  anchor: CalendarSystem,
): Occurrence {
  if (anchor === "GREGORIAN") {
    let candidate = inGregorianYear(
      from.year,
      occasion.gregorianMonth,
      occasion.gregorianDay,
    );
    if (compareParts(candidate.date, from) < 0) {
      candidate = inGregorianYear(
        from.year + 1,
        occasion.gregorianMonth,
        occasion.gregorianDay,
      );
    }

    return {
      gregorian: candidate.date,
      hijri: gregorianToHijri(candidate.date),
      daysAway: daysBetween(from, candidate.date),
      anchor: "GREGORIAN",
      years: {
        gregorian: candidate.date.year - occasion.gregorianYear,
        hijri: null,
      },
      adjusted: candidate.adjusted,
    };
  }

  // Hijri-anchored: step through Hijri years, not Gregorian ones.
  const today = gregorianToHijri(from);
  let candidate = inHijriYear(today.year, occasion.hijriMonth, occasion.hijriDay);
  if (compareParts(candidate.date, today) < 0) {
    candidate = inHijriYear(
      today.year + 1,
      occasion.hijriMonth,
      occasion.hijriDay,
    );
  }

  const gregorian = hijriToGregorian(candidate.date);
  return {
    gregorian,
    hijri: candidate.date,
    daysAway: daysBetween(from, gregorian),
    anchor: "HIJRI",
    years: { gregorian: null, hijri: candidate.date.year - occasion.hijriYear },
    adjusted: candidate.adjusted,
  };
}

/** The anchors an occasion recurs on. */
function anchorsOf(occasion: RecurringOccasion): CalendarSystem[] {
  if (occasion.observedCalendar === "BOTH") return ["GREGORIAN", "HIJRI"];
  return [occasion.observedCalendar];
}

/**
 * Fold two occurrences that landed on the same Gregorian day into one row.
 *
 * For an occasion observed by both calendars this happens roughly once every 33
 * years, when the Gregorian and Hijri anniversaries realign. Without this the
 * list would show the same birthday twice on the same day, which reads as a bug.
 */
function mergeSameDay(occurrences: Occurrence[]): Occurrence[] {
  const byDay = new Map<string, Occurrence>();

  for (const occurrence of occurrences) {
    const { year, month, day } = occurrence.gregorian;
    const key = `${year}-${month}-${day}`;
    const existing = byDay.get(key);

    if (!existing) {
      byDay.set(key, occurrence);
      continue;
    }

    byDay.set(key, {
      ...existing,
      anchor: existing.anchor === occurrence.anchor ? existing.anchor : "BOTH",
      years: {
        gregorian: existing.years.gregorian ?? occurrence.years.gregorian,
        hijri: existing.years.hijri ?? occurrence.years.hijri,
      },
      adjusted: existing.adjusted || occurrence.adjusted,
    });
  }

  return [...byDay.values()];
}

/**
 * The next time this occasion comes round on or after `from`.
 *
 * When it is observed by both calendars this is whichever anniversary arrives
 * first. Use `occurrencesBetween` to get them all.
 *
 * A non-recurring occasion returns its single date, which may be in the past;
 * callers filter those out.
 */
export function nextOccurrence(
  occasion: RecurringOccasion,
  from: GregorianDate,
): Occurrence {
  if (!occasion.recurring) {
    const gregorian = {
      year: occasion.gregorianYear,
      month: occasion.gregorianMonth,
      day: occasion.gregorianDay,
    };
    return {
      gregorian,
      hijri: {
        year: occasion.hijriYear,
        month: occasion.hijriMonth,
        day: occasion.hijriDay,
      },
      daysAway: daysBetween(from, gregorian),
      anchor: occasion.observedCalendar,
      years: { gregorian: null, hijri: null },
      adjusted: false,
    };
  }

  const candidates = mergeSameDay(
    anchorsOf(occasion).map((anchor) => nextForAnchor(occasion, from, anchor)),
  );

  return candidates.reduce((soonest, candidate) =>
    candidate.daysAway < soonest.daysAway ? candidate : soonest,
  );
}

/**
 * Every time this occasion comes round within the window.
 *
 * A Hijri occasion can land twice in one Gregorian year; an occasion observed
 * by both calendars lands about twice as often again.
 */
export function occurrencesBetween(
  occasion: RecurringOccasion,
  from: GregorianDate,
  to: GregorianDate,
): Occurrence[] {
  const windowDays = daysBetween(from, to);
  if (windowDays < 0) return [];

  if (!occasion.recurring) {
    const only = nextOccurrence(occasion, from);
    return only.daysAway >= 0 && only.daysAway <= windowDays ? [only] : [];
  }

  const results: Occurrence[] = [];

  // Walk each anchor independently, then merge. A Hijri year is ~354 days, so
  // the step count is bounded by the window rather than by trusting the data.
  for (const anchor of anchorsOf(occasion)) {
    let cursor = from;
    const maxSteps = Math.floor(windowDays / 300) + 2;

    for (let step = 0; step < maxSteps; step += 1) {
      const occurrence = nextForAnchor(occasion, cursor, anchor);
      const away = daysBetween(from, occurrence.gregorian);
      if (away > windowDays) break;
      results.push({ ...occurrence, daysAway: away });
      cursor = addOneDay(occurrence.gregorian);
    }
  }

  return mergeSameDay(results).sort((a, b) => a.daysAway - b.daysAway);
}

function addOneDay(date: GregorianDate): GregorianDate {
  const limit = daysInGregorianMonth(date.year, date.month);
  if (date.day < limit) return { ...date, day: date.day + 1 };
  if (date.month < 12) return { year: date.year, month: date.month + 1, day: 1 };
  return { year: date.year + 1, month: 1, day: 1 };
}

/** Sort helper: soonest first, then alphabetically for a stable order. */
export function bySoonest<T extends { occurrence: Occurrence; title: string }>(
  a: T,
  b: T,
): number {
  return a.occurrence.daysAway - b.occurrence.daysAway || a.title.localeCompare(b.title);
}

/** "Today", "Tomorrow", "In 12 days", "3 days ago". */
export function describeDaysAway(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `In ${days} days`;
}
