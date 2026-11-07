import { addDays, daysBetween, type GregorianDate } from "@/lib/hijri/hijri";
import { occurrencesBetween, type Occurrence, type RecurringOccasion } from "./occurrence";
import type { UpcomingOccasion } from "./queries";

/** The stored shape of an occasion, rebuilt from its loaded form. */
export function asRecurring(occasion: UpcomingOccasion): RecurringOccasion {
  return {
    observedCalendar: occasion.observedCalendar,
    recurring: occasion.recurring,
    gregorianYear: occasion.origin.gregorian.year,
    gregorianMonth: occasion.origin.gregorian.month,
    gregorianDay: occasion.origin.gregorian.day,
    hijriYear: occasion.origin.hijri.year,
    hijriMonth: occasion.origin.hijri.month,
    hijriDay: occasion.origin.hijri.day,
  };
}

/**
 * The turns that follow the one being shown, so a detail panel can say "and
 * then…" — most useful for an occasion kept in both calendars, whose next two
 * turns are on different clocks.
 */
export function laterTurns(
  occasion: UpcomingOccasion,
  { count = 3, today }: { count?: number; today: GregorianDate },
): Occurrence[] {
  if (!occasion.recurring) return [];
  const from = addDays(occasion.occurrence.gregorian, 1);
  return occurrencesBetween(asRecurring(occasion), from, addDays(from, 760))
    .slice(0, count)
    // `occurrencesBetween` measures from the window start; re-base on today.
    .map((turn) => ({ ...turn, daysAway: daysBetween(today, turn.gregorian) }));
}
