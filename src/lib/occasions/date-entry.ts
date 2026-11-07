import { z } from "zod";
import { daysInHijriMonth } from "@/lib/hijri/hijri";
import { deriveDates } from "./derive";

/**
 * The date half of any form that takes one, in either calendar. Shared so an
 * occasion and a personal date are validated and converted identically.
 */

export const EVENT_TYPES = [
  "BIRTHDAY",
  "ANNIVERSARY",
  "ENGAGEMENT",
  "NIKAH",
  "NEW_HOME",
  "NEW_JOB",
  "NEW_OFFICE",
  "SCHOOL_START",
  "GRADUATION",
  "OTHER",
] as const;

export const dateEntryFields = {
  enteredCalendar: z.enum(["GREGORIAN", "HIJRI"]),
  observedCalendar: z.enum(["GREGORIAN", "HIJRI", "BOTH"]),
  afterSunset: z.coerce.boolean(),

  // Present when entering a Gregorian date.
  gregorianDate: z.string().optional(),

  // Present when entering a Hijri date.
  hijriYear: z.coerce.number().int().min(1).max(2000).optional(),
  hijriMonth: z.coerce.number().int().min(0).max(11).optional(),
  hijriDay: z.coerce.number().int().min(1).max(30).optional(),
};

export type DateEntryInput = z.infer<z.ZodObject<typeof dateEntryFields>>;

export function checkDateEntry(value: DateEntryInput, ctx: z.RefinementCtx): void {
  if (value.enteredCalendar === "GREGORIAN") {
    if (!value.gregorianDate || !/^\d{4}-\d{2}-\d{2}$/.test(value.gregorianDate)) {
      ctx.addIssue({
        code: "custom",
        message: "Pick the date it happened.",
        path: ["gregorianDate"],
      });
    }
    return;
  }

  const { hijriYear, hijriMonth, hijriDay } = value;
  if (hijriYear == null || hijriMonth == null || hijriDay == null) {
    ctx.addIssue({
      code: "custom",
      message: "Enter the full Hijri date.",
      path: ["hijriDay"],
    });
    return;
  }
  if (hijriDay > daysInHijriMonth(hijriYear, hijriMonth)) {
    ctx.addIssue({
      code: "custom",
      message: `That month only has ${daysInHijriMonth(hijriYear, hijriMonth)} days in ${hijriYear}.`,
      path: ["hijriDay"],
    });
  }
}

/** The date fields as submitted, ready for `dateEntryFields` to parse. */
export function readDateEntry(formData: FormData) {
  return {
    enteredCalendar: formData.get("enteredCalendar"),
    observedCalendar: formData.get("observedCalendar"),
    afterSunset: formData.get("afterSunset") === "on",
    gregorianDate: formData.get("gregorianDate") ?? undefined,
    hijriYear: formData.get("hijriYear") || undefined,
    hijriMonth: formData.get("hijriMonth") || undefined,
    hijriDay: formData.get("hijriDay") || undefined,
  };
}

/**
 * Work out both calendars' dates on the server. The forms preview the same
 * conversion, but the stored value is never taken from the client.
 */
export function resolveDateEntry(input: DateEntryInput) {
  return deriveDates({
    enteredCalendar: input.enteredCalendar,
    gregorianDate: input.gregorianDate,
    afterSunset: input.afterSunset,
    hijri:
      input.enteredCalendar === "HIJRI"
        ? { year: input.hijriYear!, month: input.hijriMonth!, day: input.hijriDay! }
        : undefined,
  });
}
