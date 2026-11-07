"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { requireMembership } from "@/lib/groups/access";
import {
  checkDateEntry,
  dateEntryFields,
  EVENT_TYPES,
  readDateEntry,
  resolveDateEntry,
} from "@/lib/occasions/date-entry";
import { safeNext } from "@/lib/safe-next";

export interface EventFormState {
  error?: string;
}

const schema = z
  .object({
    groupIds: z
      .array(z.string().min(1))
      .min(1, "Choose at least one group to share it with.")
      .max(50),
    title: z.string().trim().min(1, "Give the occasion a title.").max(120),
    type: z.enum(EVENT_TYPES),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    recurring: z.coerce.boolean(),

    ...dateEntryFields,

    // Names rather than ids: rosters are per group, so the same person is a
    // different row in each group the occasion is shared with.
    personNames: z.array(z.string().trim().min(1).max(120)).max(100),
    newPeople: z.string().optional(),
  })
  .superRefine(checkDateEntry);

export async function createEvent(
  _previous: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = schema.safeParse({
    groupIds: [...new Set(formData.getAll("groupIds").map(String))],
    title: formData.get("title"),
    type: formData.get("type"),
    notes: formData.get("notes") ?? "",
    recurring: formData.get("recurring") === "on",
    ...readDateEntry(formData),
    personNames: formData.getAll("personNames").map(String),
    newPeople: formData.get("newPeople") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const input = parsed.data;

  // The group ids come from form fields, so each one is checked, never trusted.
  for (const groupId of input.groupIds) {
    try {
      await requireMembership(groupId);
    } catch {
      return { error: "You are not a member of one of those groups." };
    }
  }

  const { gregorian, hijri, afterSunset } = resolveDateEntry(input);

  // Everyone the occasion is about, ticked or typed, once each.
  const names = new Map<string, string>();
  for (const name of [
    ...input.personNames,
    ...(input.newPeople ?? "").split(",").map((part) => part.trim()),
  ]) {
    if (name && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), name);
  }

  // One copy per group, so each group's calendar and roster stay its own: a
  // later change or delete in one group never reaches into another.
  await prisma.$transaction(async (tx) => {
    for (const groupId of input.groupIds) {
      // Match each name against this group's roster only, adding whoever isn't
      // on it yet. Nothing from another group's roster is ever attached here.
      const roster = await tx.person.findMany({
        where: { groupId },
        select: { id: true, name: true },
      });
      const personIds: string[] = [];
      for (const [key, name] of names) {
        const existing = roster.find((person) => person.name.toLowerCase() === key);
        const person =
          existing ?? (await tx.person.create({ data: { name, groupId }, select: { id: true } }));
        personIds.push(person.id);
      }

      await tx.event.create({
        data: {
          groupId,
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
          people: { create: [...new Set(personIds)].map((personId) => ({ personId })) },
        },
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/people");
  redirect("/");
}

export async function deleteEvent(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Several ids when deleting an occasion shared with more than one group.
  const ids = [...new Set(formData.getAll("id").map(String).filter(Boolean))];
  if (ids.length === 0) return;

  // Look each event up first: an id alone says nothing about who may delete it.
  const events = await prisma.event.findMany({
    where: { id: { in: ids } },
    select: { id: true, groupId: true },
  });
  for (const event of events) await requireMembership(event.groupId);

  await prisma.event.deleteMany({ where: { id: { in: events.map((event) => event.id) } } });

  revalidatePath("/");
  revalidatePath("/people");
  revalidatePath("/calendar");
  for (const groupId of new Set(events.map((event) => event.groupId))) {
    revalidatePath(`/groups/${groupId}`);
  }
  // Back to the page the delete was made from, if it's one of ours.
  redirect(safeNext(formData.get("returnTo")));
}
