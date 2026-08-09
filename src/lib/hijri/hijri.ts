/**
 * Dawoodi Bohra (Misri / tabular Fatimid) Hijri calendar conversion.
 *
 * Ported from https://github.com/mygulamali/mumineen_calendar_js
 * (source/assets/javascripts/_lib/hijri_date.js), which powers
 * mumineencalendar.com.
 *
 * Two deliberate departures from the original:
 *
 *  1. We never touch `Date`. The original converts via JS `Date` objects,
 *     which silently shift a calendar day depending on the host timezone.
 *     A birthday is a calendar fact, not an instant, so every function here
 *     takes and returns plain integer parts.
 *
 *  2. Sunset is modelled explicitly. The Islamic day begins at Maghrib, so a
 *     Gregorian evening after sunset already belongs to the *next* Hijri day.
 *     See `gregorianToHijri`.
 *
 * Note this is the tabular Bohra calendar, which is arithmetic and fixed in
 * advance. It is not the same as a sighting-based or Umm al-Qura Hijri date,
 * and may differ from those by a day or two.
 */

/** Hijri years whose remainder mod 30 marks a Kabisa (leap) year. */
const KABISA_YEAR_REMAINDERS = [2, 5, 8, 10, 13, 16, 19, 21, 24, 27, 29];

/** Cumulative days elapsed at the end of each Hijri month 0..10. */
const DAYS_IN_YEAR = [30, 59, 89, 118, 148, 177, 207, 236, 266, 295, 325];

/** Cumulative days elapsed at the end of each year within a 30-year cycle. */
const DAYS_IN_30_YEARS = [
  354, 708, 1063, 1417, 1771, 2126, 2480, 2834, 3189, 3543, 3898, 4252, 4606,
  4961, 5315, 5669, 6024, 6378, 6732, 7087, 7441, 7796, 8150, 8504, 8859, 9213,
  9567, 9922, 10276, 10631,
];

/** Astronomical Julian Day at the epoch (1 Moharram 1 AH), at midnight. */
const HIJRI_EPOCH_AJD = 1948083.5;

/** Months are 0-indexed, matching the upstream library. */
export const HIJRI_MONTHS_LONG = [
  "Moharram al-Haraam",
  "Safar al-Muzaffar",
  "Rabi al-Awwal",
  "Rabi al-Aakhar",
  "Jumada al-Ula",
  "Jumada al-Ukhra",
  "Rajab al-Asab",
  "Shabaan al-Karim",
  "Ramadaan al-Moazzam",
  "Shawwal al-Mukarram",
  "Zilqadah al-Haraam",
  "Zilhaj al-Haraam",
] as const;

export const HIJRI_MONTHS_SHORT = [
  "Moharram",
  "Safar",
  "Rabi I",
  "Rabi II",
  "Jumada I",
  "Jumada II",
  "Rajab",
  "Shabaan",
  "Ramadaan",
  "Shawwal",
  "Zilqadah",
  "Zilhaj",
] as const;

export const GREGORIAN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** A Gregorian calendar date. `month` is 1-12, `day` is 1-31. */
export interface GregorianDate {
  year: number;
  month: number;
  day: number;
}

/** A Hijri calendar date. `month` is 0-11 (0 = Moharram), `day` is 1-30. */
export interface HijriDate {
  year: number;
  month: number;
  day: number;
}

// ---------------------------------------------------------------------------
// Hijri arithmetic
// ---------------------------------------------------------------------------

/** Is this Hijri year a Kabisa (leap) year, i.e. does Zilhaj run to 30 days? */
export function isKabisa(year: number): boolean {
  return KABISA_YEAR_REMAINDERS.includes(year % 30);
}

/** Days in the given Hijri month. Odd months are 29 days, except a Kabisa Zilhaj. */
export function daysInHijriMonth(year: number, month: number): number {
  return (month === 11 && isKabisa(year)) || month % 2 === 0 ? 30 : 29;
}

/** Days elapsed in the Hijri year up to and including this date. */
function dayOfHijriYear({ month, day }: HijriDate): number {
  return month === 0 ? day : DAYS_IN_YEAR[month - 1] + day;
}

/**
 * True when a Hijri month/day pair exists in the given year. Only 30 Zilhaj is
 * ever missing: it exists in Kabisa years only, so an event on that date has no
 * anniversary in roughly 19 years out of every 30.
 */
export function hijriDateExists(year: number, month: number, day: number): boolean {
  return day >= 1 && day <= daysInHijriMonth(year, month);
}

// ---------------------------------------------------------------------------
// Julian Day conversion
// ---------------------------------------------------------------------------

/**
 * Dates before the Gregorian reform (15 October 1582) are Julian. Retained from
 * the upstream library for fidelity; family events never reach back this far.
 */
function isJulian({ year, month, day }: GregorianDate): boolean {
  if (year < 1582) return true;
  if (year > 1582) return false;
  if (month < 10) return true;
  return month === 10 && day < 5;
}

/** Astronomical Julian Day at midnight starting the given Gregorian date. */
export function gregorianToAJD(date: GregorianDate): number {
  let { year, month } = date;
  const { day } = date;

  // Shift the year to start in March so the leap day falls at its end.
  if (month < 3) {
    year -= 1;
    month += 12;
  }

  let b = 0;
  if (!isJulian(date)) {
    const a = Math.floor(year / 100);
    b = 2 - a + Math.floor(a / 4);
  }

  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    b -
    1524.5
  );
}

/** Gregorian date containing the given Astronomical Julian Day. */
export function ajdToGregorian(ajd: number): GregorianDate {
  const z = Math.floor(ajd + 0.5);

  let a: number;
  if (z < 2299161) {
    a = z;
  } else {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(0.25 * alpha);
  }

  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);

  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13; // 1-12
  const year = month > 2 ? c - 4716 : c - 4715;

  return { year, month, day };
}

/** Astronomical Julian Day at midnight starting the given Hijri date. */
export function hijriToAJD(date: HijriDate): number {
  const y30 = Math.floor(date.year / 30);
  let ajd = HIJRI_EPOCH_AJD + y30 * 10631 + dayOfHijriYear(date);
  if (date.year % 30 !== 0) {
    ajd += DAYS_IN_30_YEARS[date.year - y30 * 30 - 1];
  }
  return ajd;
}

/** Hijri date containing the given Astronomical Julian Day. */
export function hijriFromAJD(ajd: number): HijriDate {
  // Days since the epoch, counting the epoch day itself as 1.
  const elapsed = Math.floor(ajd - HIJRI_EPOCH_AJD);

  // Split into 30-year cycles on a 0-based count, then restore the 1-based day
  // within the cycle. The upstream library divides the 1-based value directly,
  // which pushes the final day of a cycle (30 Zilhaj of year 29, e.g. 1439)
  // into the next cycle and decodes it as day 0 of the following year.
  const y30 = Math.floor((elapsed - 1) / 10631);
  let left = elapsed - y30 * 10631;

  let i = 0;
  while (i < 29 && left > DAYS_IN_30_YEARS[i]) i += 1;
  const year = y30 * 30 + i;
  if (i > 0) left -= DAYS_IN_30_YEARS[i - 1];

  i = 0;
  while (i < 11 && left > DAYS_IN_YEAR[i]) i += 1;
  const month = i;
  const day = i > 0 ? left - DAYS_IN_YEAR[i - 1] : left;

  return { year, month, day };
}

// ---------------------------------------------------------------------------
// Public conversion
// ---------------------------------------------------------------------------

/**
 * Convert a Gregorian date to its Bohra Hijri equivalent.
 *
 * The Islamic day begins at Maghrib, so an event that happened after sunset
 * belongs to the Hijri day that started that evening — one day later than the
 * same clock date before sunset. A birth at 09:00 on 14 Nov 2008 is 17
 * Zilqadah 1429; the same birth at 20:00 that night is 18 Zilqadah 1429.
 */
export function gregorianToHijri(
  date: GregorianDate,
  options: { afterSunset?: boolean } = {},
): HijriDate {
  const ajd = gregorianToAJD(date) + (options.afterSunset ? 1 : 0);
  return hijriFromAJD(ajd);
}

/**
 * Convert a Hijri date to Gregorian.
 *
 * Returns the Gregorian date on which the Hijri day mostly falls — i.e. the
 * daylight portion. The Hijri day actually began at sunset on the preceding
 * Gregorian evening.
 */
export function hijriToGregorian(date: HijriDate): GregorianDate {
  return ajdToGregorian(hijriToAJD(date));
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatHijri(
  date: HijriDate,
  style: "long" | "short" = "short",
): string {
  const months = style === "long" ? HIJRI_MONTHS_LONG : HIJRI_MONTHS_SHORT;
  return `${date.day} ${months[date.month]} ${date.year}`;
}

export function formatGregorian(
  date: GregorianDate,
  style: "long" | "short" = "short",
): string {
  const name = GREGORIAN_MONTHS[date.month - 1];
  return `${date.day} ${style === "short" ? name.slice(0, 3) : name} ${date.year}`;
}

/** ISO `YYYY-MM-DD` for a Gregorian date, without going through `Date`. */
export function toISODate({ year, month, day }: GregorianDate): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parse an ISO `YYYY-MM-DD` string. Throws on anything else. */
export function fromISODate(iso: string): GregorianDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`Not an ISO date: ${iso}`);
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

/** Add whole days to a Gregorian date, staying in integer arithmetic. */
export function addDays(date: GregorianDate, days: number): GregorianDate {
  return ajdToGregorian(gregorianToAJD(date) + days);
}

/** Whole days from `a` to `b`; negative when `b` is earlier. */
export function daysBetween(a: GregorianDate, b: GregorianDate): number {
  return Math.round(gregorianToAJD(b) - gregorianToAJD(a));
}

/** Day of week, 0 = Sunday. */
export function dayOfWeek(date: GregorianDate): number {
  return (Math.floor(gregorianToAJD(date) + 0.5) + 1) % 7;
}
