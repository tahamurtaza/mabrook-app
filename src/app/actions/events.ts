"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { requireMembership } from "@/lib/groups/access";
import { daysInHijriMonth } from "@/lib/hijri/hijri";
import { deriveDates } from "@/lib/occasions/derive";

export interface EventFormState {
  error?: string;
}

const EVENT_TYPES = [
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

const schema = z
  .object({
    groupId: z.string().min(1, "Choose which group this belongs to."),
    title: z.string().trim().min(1, "Give the occasion a title.").max(120),
    type: z.enum(EVENT_TYPES),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),

    enteredCalendar: z.enum(["GREGORIAN", "HIJRI"]),
    observedCalendar: z.enum(["GREGORIAN", "HIJRI"]),
    afterSunset: z.coerce.boolean(),
    recurring: z.coerce.boolean(),

    // Present when entering a Gregorian date.
    gregorianDate: z.string().optional(),

    // Present when entering a Hijri date.
    hijriYear: z.coerce.number().int().min(1).max(2000).optional(),
    hijriMonth: z.coerce.number().int().min(0).max(11).optional(),
    hijriDay: z.coerce.number().int().min(1).max(30).optional(),

    personIds: z.array(z.string()),
    newPeople: z.string().optional(),
  })
  .superRefine((value, ctx) => {
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
  });

export async function createEvent(
  _previous: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = schema.safeParse({
    groupId: formData.get("groupId"),
    title: formData.get("title"),
    type: formData.get("type"),
    notes: formData.get("notes") ?? "",
    enteredCalendar: formData.get("enteredCalendar"),
    observedCalendar: formData.get("observedCalendar"),
    afterSunset: formData.get("afterSunset") === "on",
    recurring: formData.get("recurring") === "on",
    gregorianDate: formData.get("gregorianDate") ?? undefined,
    hijriYear: formData.get("hijriYear") || undefined,
    hijriMonth: formData.get("hijriMonth") || undefined,
    hijriDay: formData.get("hijriDay") || undefined,
    personIds: formData.getAll("personIds").map(String),
    newPeople: formData.get("newPeople") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const input = parsed.data;

  // The group id comes from a form field, so it is checked, never trusted.
  try {
    await requireMembership(input.groupId);
  } catch {
    return { error: "You are not a member of that group." };
  }

  // Derive the other calendar's date on the server. The form previews the same
  // conversion client-side, but the stored value is never taken from the client.
  const { gregorian, hijri, afterSunset } = deriveDates({
    enteredCalendar: input.enteredCalendar,
    gregorianDate: input.gregorianDate,
    afterSunset: input.afterSunset,
    hijri:
      input.enteredCalendar === "HIJRI"
        ? {
            year: input.hijriYear!,
            month: input.hijriMonth!,
            day: input.hijriDay!,
          }
        : undefined,
  });

  const names = (input.newPeople ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  await prisma.$transaction(async (tx) => {
    const created = await Promise.all(
      names.map((name) => tx.person.create({ data: { name, groupId: input.groupId } })),
    );

    // Only people already on this group's roster may be attached. The ids come
    // from checkboxes, so a crafted request could otherwise name someone from
    // another group and leak their name onto this calendar.
    const existing = await tx.person.findMany({
      where: { groupId: input.groupId, id: { in: input.personIds } },
      select: { id: true },
    });

    const personIds = [
      ...new Set([...existing.map((p) => p.id), ...created.map((p) => p.id)]),
    ];

    await tx.event.create({
      data: {
        groupId: input.groupId,
        title: input.title,
        type: input.type,
        notes: input.notes || null,
        observedCalendar: input.observedCalendar,
        enteredCalendar: input.enteredCalendar,
        gregorianYear: gregorian.year,
        gregorianMonth: gregorian.month,
        gregorianDay: gregorian.day,
        hijriYear: hijri.year,
        hijriMonth: hijri.month,
        hijriDay: hijri.day,
        afterSunset,
        recurring: input.recurring,
        createdById: user.id,
        people: { create: personIds.map((personId) => ({ personId })) },
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/people");
  redirect("/");
}

export async function deleteEvent(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Look the event up first: the id alone says nothing about who may delete it.
  const event = await prisma.event.findUnique({
    where: { id },
    select: { groupId: true },
  });
  if (!event) return;

  await requireMembership(event.groupId);
  await prisma.event.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/people");
  redirect("/");
}
