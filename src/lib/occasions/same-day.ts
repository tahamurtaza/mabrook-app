import { toISODate } from "@/lib/hijri/hijri";
import type { UpcomingOccasion } from "./queries";

/**
 * Occasions sharing a day are the point of a family calendar, not an edge case:
 * two cousins born on the same date must both be seen. Anything answering
 * "what's next?" has to answer with a day, never with a single row.
 */

/** Everything on the soonest day in a list sorted soonest first. */
export function soonestDay(occasions: UpcomingOccasion[]): UpcomingOccasion[] {
  const first = occasions[0];
  if (!first) return [];
  const iso = toISODate(first.occurrence.gregorian);
  return occasions.filter((occasion) => toISODate(occasion.occurrence.gregorian) === iso);
}

/** Runs of occasions on the same day, keeping the list's order. */
export function groupByDay(occasions: UpcomingOccasion[]): UpcomingOccasion[][] {
  const days: UpcomingOccasion[][] = [];
  for (const occasion of occasions) {
    const current = days.at(-1);
    const sameDay =
      current &&
      toISODate(current[0].occurrence.gregorian) === toISODate(occasion.occurrence.gregorian);
    if (sameDay) current.push(occasion);
    else days.push([occasion]);
  }
  return days;
}
