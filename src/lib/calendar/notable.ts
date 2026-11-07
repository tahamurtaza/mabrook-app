import type { HijriDate } from "@/lib/hijri/hijri";

/**
 * Days in the Hijri year worth marking on the calendar for orientation.
 *
 * Kept deliberately short — only fixed dates observed across the community —
 * and keyed by Hijri month (0 = Moharram) and day, so they fall on the right
 * Gregorian day every year without any lookup table.
 */
const NOTABLE_DAYS: { month: number; day: number; name: string }[] = [
  { month: 0, day: 1, name: "Hijri New Year" },
  { month: 0, day: 10, name: "Ashura" },
  { month: 8, day: 1, name: "Ramadaan begins" },
  { month: 9, day: 1, name: "Eid al-Fitr" },
  { month: 11, day: 10, name: "Eid al-Adha" },
  { month: 11, day: 18, name: "Eid-e-Ghadeer" },
];

export function notableDay(hijri: HijriDate): string | null {
  return (
    NOTABLE_DAYS.find((entry) => entry.month === hijri.month && entry.day === hijri.day)
      ?.name ?? null
  );
}
