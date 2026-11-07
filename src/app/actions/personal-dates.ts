"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { requireMembership } from "@/lib/groups/access";
import { daysBetween } from "@/lib/hijri/hijri";
import {
  checkDateEntry,
  dateEntryFields,
  EVENT_TYPES,
  readDateEntry,
  resolveDateEntry,
} from "@/lib/occasions/date-entry";
import { personalDateTitle } from "@/lib/occasions/labels";
import { releaseAdopted, shareDates, unshareDate } from "@/lib/occasions/personal-dates";
import { today } from "@/lib/today";

export interface PersonalDateFormState {
  error?: string;
}

const schema = z
  .object({
    type: z.enum(EVENT_TYPES),
    label: z.string().trim().max(80).optional(),
    ...dateEntryFields,
  })
  .superRefine((value, ctx) => {
    checkDateEntry(value, ctx);
    if (value.type === "OTHER" && !value.label) {
      ctx.addIssue({ code: "custom", message: "Say what the date is.", path: ["label"] });
    }
  });

// A date can show up anywhere a shared occasion does.
function refreshPages() {
  revalidatePath("/", "layout");
}

/** Validate a submitted date, for adding it or for changing the one in `excludeId`. */
async function readDate(userId: string, formData: FormData, excludeId?: string) {
  const parsed = schema.safeParse({
    type: formData.get("type"),
    label: formData.get("label") ?? undefined,
    ...readDateEntry(formData),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const input = parsed.data;
  const { gregorian, hijri, afterSunset } = resolveDateEntry(input);

  if (input.type === "BIRTHDAY") {
    if (daysBetween(today(), gregorian) > 0) {
      return { error: "A birthday can't be in the future." };
    }
    const existing = await prisma.personalDate.count({
      where: { userId, type: "BIRTHDAY", id: { not: excludeId } },
    });
    if (existing > 0) return { error: "You've already added your birthday." };
  }

  return {
    date: {
      type: input.type,
      observedCalendar: input.observedCalendar,
      enteredCalendar: input.enteredCalendar,
      gregorianYear: gregorian.year,
      gregorianMonth: gregorian.month,
      gregorianDay: gregorian.day,
      hijriYear: hijri.year,
      hijriMonth: hijri.month,
      hijriDay: hijri.day,
      afterSunset,
    },
    label: input.type === "OTHER" ? (input.label ?? null) : null,
  };
}

export async function addPersonalDate(
  _previous: PersonalDateFormState,
  formData: FormData,
): Promise<PersonalDateFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const result = await readDate(user.id, formData);
  if ("error" in result) return { error: result.error };

  await prisma.personalDate.create({
    data: { ...result.date, label: result.label, userId: user.id },
  });

  refreshPages();
  return {};
}

export async function updatePersonalDate(
  _previous: PersonalDateFormState,
  formData: FormData,
): Promise<PersonalDateFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const result = await readDate(user.id, formData, id);
  if ("error" in result) return { error: result.error };

  const { date, label } = result;

  const updated = await prisma.$transaction(async (tx) => {
    // Scoped to the owner, so someone else's id simply matches nothing.
    const { count } = await tx.personalDate.updateMany({
      where: { id, userId: user.id },
      data: { ...date, label },
    });
    if (count === 0) return false;

    // Every group it's shared with sees the correction.
    await tx.event.updateMany({
      where: { personalDateId: id },
      data: { ...date, title: personalDateTitle(user.name, { type: date.type, label }) },
    });
    return true;
  });
  if (!updated) return { error: "That date couldn't be found." };

  refreshPages();
  return {};
}

export async function deletePersonalDate(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Scoped to the owner, so someone else's id simply matches nothing. Group
  // copies go with it by cascade, except what the group already had.
  const id = String(formData.get("id") ?? "");
  await releaseAdopted({ personalDateId: id, personalDate: { userId: user.id } });
  await prisma.personalDate.deleteMany({ where: { id, userId: user.id } });

  refreshPages();
}

/** Turn one date on or off for one group. */
export async function setDateSharing(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const dateId = String(formData.get("dateId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");

  await requireMembership(groupId);

  if (formData.get("share") === "on") {
    await shareDates({ user, groupId, dateIds: [dateId] });
  } else {
    await unshareDate(user.id, dateId, groupId);
  }

  refreshPages();
  revalidatePath(`/groups/${groupId}`);
}
