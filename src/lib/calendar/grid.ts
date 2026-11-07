/**
 * Month and year grids for the calendar view, in either calendar.
 *
 * A grid is always a run of real Gregorian days, Sunday to Saturday, with the
 * Hijri date of each worked out by the same conversion the rest of the app
 * uses. What changes between the two modes is only which calendar's month the
 * grid is framed around — a Hijri month starts on whatever weekday it starts
 * on, just as a Gregorian one does.
 */

import {
  addDays,
  dayOfWeek,
  daysBetween,
  daysInHijriMonth,
  GREGORIAN_MONTHS,
  gregorianToHijri,
  hijriToGregorian,
  HIJRI_MONTHS_LONG,
  HIJRI_MONTHS_SHORT,
  toISODate,
  type GregorianDate,
  type HijriDate,
} from "@/lib/hijri/hijri";

export type CalendarMode = "gregorian" | "hijri";

/** Arabic month names, matching the long Bohra forms in `HIJRI_MONTHS_LONG`. */
export const HIJRI_MONTHS_ARABIC = [
  "محرم الحرام",
  "صفر المظفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الأخرى",
  "رجب الأصب",
  "شعبان الكريم",
  "رمضان المعظم",
  "شوال المكرم",
  "ذو القعدة الحرام",
  "ذو الحجة الحرام",
] as const;

export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function daysInGregorianMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return [1, 3, 5, 7, 8, 10, 12].includes(month) ? 31 : 30;
}

/** A month in either calendar. Gregorian months are 1-12, Hijri 0-11. */
export interface MonthRef {
  mode: CalendarMode;
  year: number;
  month: number;
}

export interface DayCell {
  iso: string;
  gregorian: GregorianDate;
  hijri: HijriDate;
  weekday: number;
  /** Inside the month the grid is framed around. */
  inMonth: boolean;
  /**
   * Which month of the *other* calendar this day belongs to, counted from the
   * first one the grid touches. Alternate values get a faint band, so the
   * point where the other calendar turns its month is visible at a glance.
   */
  otherMonthIndex: number;
}

export interface MonthGrid extends MonthRef {
  title: string;
  /** The other calendar's months this one spans, e.g. "Jumada I – II 1448". */
  span: string;
  first: GregorianDate;
  last: GregorianDate;
  length: number;
  cells: DayCell[];
}

function otherMonthKey(mode: CalendarMode, cell: { gregorian: GregorianDate; hijri: HijriDate }) {
  return mode === "gregorian"
    ? cell.hijri.year * 12 + cell.hijri.month
    : cell.gregorian.year * 12 + cell.gregorian.month;
}

/** First day and length of a month, in Gregorian days. */
export function monthBounds({ mode, year, month }: MonthRef): {
  first: GregorianDate;
  length: number;
} {
  if (mode === "gregorian") {
    return { first: { year, month, day: 1 }, length: daysInGregorianMonth(year, month) };
  }
  return {
    first: hijriToGregorian({ year, month, day: 1 }),
    length: daysInHijriMonth(year, month),
  };
}

export function monthTitle({ mode, year, month }: MonthRef, style: "long" | "short" = "long") {
  if (mode === "gregorian") {
    const name = GREGORIAN_MONTHS[month - 1];
    return `${style === "short" ? name.slice(0, 3) : name} ${year}`;
  }
  return `${style === "short" ? HIJRI_MONTHS_SHORT[month] : HIJRI_MONTHS_LONG[month]} ${year}`;
}

/** Caption naming the other calendar's months that a month overlaps. */
export function spanCaption(mode: CalendarMode, first: GregorianDate, last: GregorianDate): string {
  if (mode === "gregorian") {
    const a = gregorianToHijri(first);
    const b = gregorianToHijri(last);
    if (a.year === b.year && a.month === b.month) return `${HIJRI_MONTHS_SHORT[a.month]} ${a.year}`;
    if (a.year === b.year) {
      return `${HIJRI_MONTHS_SHORT[a.month]} – ${HIJRI_MONTHS_SHORT[b.month]} ${b.year}`;
    }
    return `${HIJRI_MONTHS_SHORT[a.month]} ${a.year} – ${HIJRI_MONTHS_SHORT[b.month]} ${b.year}`;
  }

  const short = (m: number) => GREGORIAN_MONTHS[m - 1].slice(0, 3);
  if (first.year === last.year && first.month === last.month) {
    return `${GREGORIAN_MONTHS[first.month - 1]} ${first.year}`;
  }
  if (first.year === last.year) return `${short(first.month)} – ${short(last.month)} ${last.year}`;
  return `${short(first.month)} ${first.year} – ${short(last.month)} ${last.year}`;
}

/**
 * A month framed as whole weeks. Leading and trailing days from neighbouring
 * months are included (and marked `inMonth: false`) so the grid is rectangular.
 */
export function monthGrid(ref: MonthRef): MonthGrid {
  const { first, length } = monthBounds(ref);
  const last = addDays(first, length - 1);
  const leading = dayOfWeek(first);
  const total = Math.ceil((leading + length) / 7) * 7;
  const start = addDays(first, -leading);

  const cells: DayCell[] = [];
  let index = 0;
  let previousKey: number | null = null;

  for (let offset = 0; offset < total; offset += 1) {
    const gregorian = addDays(start, offset);
    const hijri = gregorianToHijri(gregorian);
    const key = otherMonthKey(ref.mode, { gregorian, hijri });
    if (previousKey !== null && key !== previousKey) index += 1;
    previousKey = key;

    cells.push({
      iso: toISODate(gregorian),
      gregorian,
      hijri,
      weekday: offset % 7,
      inMonth: offset >= leading && offset < leading + length,
      otherMonthIndex: index,
    });
  }

  return {
    ...ref,
    title: monthTitle(ref),
    span: spanCaption(ref.mode, first, last),
    first,
    last,
    length,
    cells,
  };
}

/** The month of the given calendar that contains a Gregorian day. */
export function monthContaining(mode: CalendarMode, date: GregorianDate): MonthRef {
  if (mode === "gregorian") return { mode, year: date.year, month: date.month };
  const hijri = gregorianToHijri(date);
  return { mode, year: hijri.year, month: hijri.month };
}

export function shiftMonth(ref: MonthRef, by: number): MonthRef {
  const base = ref.mode === "gregorian" ? ref.month - 1 : ref.month;
  const total = ref.year * 12 + base + by;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  return { mode: ref.mode, year, month: ref.mode === "gregorian" ? month + 1 : month };
}

/** Every month of a year in the given calendar. */
export function yearMonths(mode: CalendarMode, year: number): MonthRef[] {
  return Array.from({ length: 12 }, (_, i) => ({
    mode,
    year,
    month: mode === "gregorian" ? i + 1 : i,
  }));
}

/** First and last Gregorian day of a year in either calendar. */
export function yearBounds(mode: CalendarMode, year: number) {
  const first = monthBounds({ mode, year, month: mode === "gregorian" ? 1 : 0 });
  const lastMonth = monthBounds({ mode, year, month: mode === "gregorian" ? 12 : 11 });
  return { first: first.first, last: addDays(lastMonth.first, lastMonth.length - 1) };
}

/** True when `date` lies within [from, to]. */
export function within(date: GregorianDate, from: GregorianDate, to: GregorianDate) {
  return daysBetween(from, date) >= 0 && daysBetween(date, to) >= 0;
}
