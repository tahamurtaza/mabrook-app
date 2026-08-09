import {
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
  /** Only meaningful when entering a Gregorian date. */
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

  // A Hijri date already names the day, since the Hijri day is what begins at
  // sunset. There is no sunset question to ask, so the flag stays false.
  return {
    gregorian: hijriToGregorian(entry.hijri),
    hijri: entry.hijri,
    afterSunset: false,
  };
}
