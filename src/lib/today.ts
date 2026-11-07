import type { GregorianDate } from "@/lib/hijri/hijri";

/**
 * Today's calendar date in the family's timezone.
 *
 * Servers run in UTC, so a server rendering at 21:00 in Mumbai
 * would otherwise still think it was yesterday and put a birthday one row too
 * far down the list. Set APP_TIME_ZONE to the family's zone.
 */
export const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Kolkata";

export function today(timeZone: string = APP_TIME_ZONE): GregorianDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: get("year"), month: get("month"), day: get("day") };
}
