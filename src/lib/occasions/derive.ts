import {
  addDays,
  fromISODate,
  gregorianToHijri,
  hijriToGregorian,
  type GregorianDate,
  type HijriDate,
} from "@/lib/hijri/hijri";
import type { CalendarSystem } from "./occurrence";

export interface DateEntry {
  enteredCalendar: CalendarSystem;
  /** ISO `YYYY-MM-DD`, when entering a Gregorian date. */
  gregorianDate?: string;
  /** When entering a Hijri date. */
  hijri?: HijriDate;
  /**
   * Gregorian entry: it happened after Maghrib, so the Hijri date is the next
   * one. Hijri entry: it happened in that Hijri day's evening — between Maghrib
   * and midnight — so the Gregorian date is the one before.
   */
  afterSunset?: boolean;
}

export interface DerivedDates {
  gregorian: GregorianDate;
  hijri: HijriDate;
  afterSunset: boolean;
}

/**
 * Fill in whichever date the user didn't type.
 *
 * Split out of the server action so the conversion rules — especially the
 * sunset roll — can be tested without a database or a request.
 */
export function deriveDates(entry: DateEntry): DerivedDates {
  if (entry.enteredCalendar === "GREGORIAN") {
    if (!entry.gregorianDate) {
      throw new Error("A Gregorian date is required when entering one.");
    }
    const gregorian = fromISODate(entry.gregorianDate);
    const afterSunset = entry.afterSunset ?? false;
    return { gregorian, hijri: gregorianToHijri(gregorian, { afterSunset }), afterSunset };
  }

  if (!entry.hijri) {
    throw new Error("A Hijri date is required when entering one.");
  }

  // A Hijri day runs from Maghrib to Maghrib, so it covers two Gregorian dates:
  // the evening of one and the daylight of the next. `hijriToGregorian` gives
  // the daylight one. An occasion in the evening part — after Maghrib but
  // before midnight — was on the Gregorian day before, and is exactly the
  // "after sunset" case seen from the other side: that Gregorian date plus the
  // flag converts straight back to the Hijri date that was entered.
  const daytime = hijriToGregorian(entry.hijri);
  const evening = entry.afterSunset ?? false;
  return {
    gregorian: evening ? addDays(daytime, -1) : daytime,
    hijri: entry.hijri,
    afterSunset: evening,
  };
}
