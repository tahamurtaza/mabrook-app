/**
 * Works out when an occasion next comes round.
 *
 * The whole point of the app lives here: two occasions on the same list can
 * recur on two different clocks. A Gregorian birthday returns to the same 14
 * November every year. A Hijri birthday returns to the same 17 Zilqadah, which
 * lands about eleven days earlier each Gregorian year. To build one merged
 * "upcoming" list we project every occasion forward onto a Gregorian day.
 */

import {
  daysBetween,
  daysInHijriMonth,
  gregorianToHijri,
  hijriToGregorian,
  type GregorianDate,
  type HijriDate,
} from "@/lib/hijri/hijri";

export type CalendarSystem = "GREGORIAN" | "HIJRI";

/** The stored shape an occurrence is computed from. */
export interface RecurringOccasion {
  observedCalendar: CalendarSystem;
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
   * How many years the occasion completes, counted in its observed calendar —
   * the age on a birthday. Null when the original year is unknown or the
   * occasion does not recur.
   */
  yearsCompleted: number | null;
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

/**
 * The next time this occasion comes round on or after `from`.
 *
 * A non-recurring occasion returns its single date, which may be in the past;
 * callers filter those out. `from` defaults to nothing — pass today explicitly
 * so the result is deterministic and testable.
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
      yearsCompleted: null,
      adjusted: false,
    };
  }

  if (occasion.observedCalendar === "GREGORIAN") {
    // Try this Gregorian year; if it has already passed, take the next.
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
      yearsCompleted: candidate.date.year - occasion.gregorianYear,
      adjusted: candidate.adjusted,
    };
  }

  // Hijri-observed: step through Hijri years, not Gregorian ones.
  const today = gregorianToHijri(from);
  let candidate = inHijriYear(
    today.year,
    occasion.hijriMonth,
    occasion.hijriDay,
  );
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
    yearsCompleted: candidate.date.year - occasion.hijriYear,
    adjusted: candidate.adjusted,
  };
}

/**
 * Every time this occasion comes round within the window, so a Hijri occasion
 * that lands twice in one Gregorian year shows up twice.
 */
export function occurrencesBetween(
  occasion: RecurringOccasion,
  from: GregorianDate,
  to: GregorianDate,
): Occurrence[] {
  const results: Occurrence[] = [];
  let cursor = from;

  // A Hijri year is ~354 days, so at most one occurrence per ~354-day step.
  // Guard the loop on the window length rather than trusting the data.
  const windowDays = daysBetween(from, to);
  if (windowDays < 0) return results;
  const maxOccurrences = Math.floor(windowDays / 300) + 2;

  for (let i = 0; i < maxOccurrences; i += 1) {
    const occurrence = nextOccurrence(occasion, cursor);
    if (daysBetween(from, occurrence.gregorian) > windowDays) break;
    results.push({ ...occurrence, daysAway: daysBetween(from, occurrence.gregorian) });
    if (!occasion.recurring) break;
    cursor = addOneDay(occurrence.gregorian);
  }

  return results;
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
