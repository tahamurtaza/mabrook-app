import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { personalDateTitle } from "./labels";

/**
 * Someone's own dates, and the copies they've chosen to put on group calendars.
 *
 * These dates are private by default, so every function here is scoped to one
 * user: an id alone never reaches a date that isn't theirs, and nothing is
 * shared unless the owner asked for it by name.
 */

export function getPersonalDates(userId: string) {
  return prisma.personalDate.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { events: { select: { groupId: true } } },
  });
}

/**
 * Put a user's chosen dates on a group's calendar. Safe to call twice. Callers
 * must already know the user belongs to the group.
 */
export async function shareDates({
  user,
  groupId,
  dateIds,
}: {
  user: { id: string; name: string };
  groupId: string;
  dateIds: string[];
}): Promise<void> {
  const dates = await prisma.personalDate.findMany({
    where: { userId: user.id, id: { in: dateIds } },
    include: { events: { where: { groupId }, select: { id: true } } },
  });
  const toShare = dates.filter((date) => date.events.length === 0);
  if (toShare.length === 0) return;

  await prisma.$transaction(async (tx) => {
    // The occasion is about them, so it hangs off their own roster entry.
    const person = await tx.person.upsert({
      where: { groupId_userId: { groupId, userId: user.id } },
      create: { groupId, userId: user.id, name: user.name },
      update: {},
      select: { id: true },
    });

    for (const date of toShare) {
      await tx.event.create({
        data: {
          groupId,
          personalDateId: date.id,
          title: personalDateTitle(user.name, date),
          type: date.type,
          observedCalendar: date.observedCalendar,
          enteredCalendar: date.enteredCalendar,
          gregorianYear: date.gregorianYear,
          gregorianMonth: date.gregorianMonth,
          gregorianDay: date.gregorianDay,
          hijriYear: date.hijriYear,
          hijriMonth: date.hijriMonth,
          hijriDay: date.hijriDay,
          afterSunset: date.afterSunset,
          createdById: user.id,
          people: { create: { personId: person.id } },
        },
      });
    }
  });
}

/** Take one date off one group's calendar. */
export async function unshareDate(userId: string, dateId: string, groupId: string): Promise<void> {
  await prisma.event.deleteMany({
    where: { groupId, personalDateId: dateId, personalDate: { userId } },
  });
}

/**
 * Someone leaving a group takes their own dates with them. Anything the group
 * had before they joined stays behind.
 */
export async function unshareAllDates(userId: string, groupId: string): Promise<void> {
  await releaseAdopted({ groupId, personalDate: { userId } });
  await prisma.event.deleteMany({ where: { groupId, personalDate: { userId } } });
}

/** Hand occasions joined to someone's date back to the group as plain events. */
export async function releaseAdopted(where: Prisma.EventWhereInput): Promise<void> {
  await prisma.event.updateMany({
    where: { ...where, adopted: true },
    data: { adopted: false, personalDateId: null },
  });
}
