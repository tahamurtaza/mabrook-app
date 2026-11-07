import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { findMatches, sameOccasion } from "./matching";

/**
 * Who's who on a group's list: linking someone's account to an entry that was
 * already there, undoing that, and merging two entries.
 *
 * Callers check the group first; nothing here decides who may do what.
 */

type Tx = Prisma.TransactionClient;

const occasionFields = {
  id: true,
  title: true,
  type: true,
  observedCalendar: true,
  gregorianYear: true,
  gregorianMonth: true,
  gregorianDay: true,
  hijriYear: true,
  hijriMonth: true,
  hijriDay: true,
} as const;

/** Entries on a group's list with no account behind them, and their occasions. */
export async function getUnclaimedEntries(groupId: string) {
  const people = await prisma.person.findMany({
    where: { groupId, userId: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      events: { select: { event: { select: occasionFields } } },
    },
  });
  return people.map((person) => ({
    id: person.id,
    name: person.name,
    occasions: person.events.map((link) => link.event),
  }));
}

export type UnclaimedEntry = Awaited<ReturnType<typeof getUnclaimedEntries>>[number];

/** Has this user already linked themselves to an entry in this group? */
async function hasClaimed(userId: string, groupId: string): Promise<boolean> {
  const count = await prisma.person.count({
    where: { groupId, userId, claimedName: { not: null } },
  });
  return count > 0;
}

/** Entries that might be this user, likeliest first. */
export async function findMyEntries(user: { id: string; name: string }, groupId: string) {
  if (await hasClaimed(user.id, groupId)) return [];

  const [entries, dates] = await Promise.all([
    getUnclaimedEntries(groupId),
    prisma.personalDate.findMany({ where: { userId: user.id } }),
  ]);
  return findMatches({ name: user.name, dates }, entries);
}

/** Whether to offer "is someone on this list you?" at all. */
export async function canClaim(userId: string, groupId: string): Promise<boolean> {
  if (await hasClaimed(userId, groupId)) return false;
  return (await prisma.person.count({ where: { groupId, userId: null } })) > 0;
}

/** Put everything on one entry onto another, keeping roles. */
async function moveOccasions(tx: Tx, fromId: string, intoId: string): Promise<void> {
  const links = await tx.eventPerson.findMany({ where: { personId: fromId } });
  for (const link of links) {
    await tx.eventPerson.upsert({
      where: { eventId_personId: { eventId: link.eventId, personId: intoId } },
      create: { eventId: link.eventId, personId: intoId, role: link.role },
      update: {},
    });
  }
  await tx.eventPerson.deleteMany({ where: { personId: fromId } });
}

/**
 * Where an occasion on someone's entry is one of their own dates, keep the one
 * the group already had and join it to their date, so there's one row and later
 * edits in Settings reach it.
 */
async function adoptMatchingOccasions(
  tx: Tx,
  { userId, groupId, personId }: { userId: string; groupId: string; personId: string },
): Promise<void> {
  const [dates, occasions] = await Promise.all([
    tx.personalDate.findMany({ where: { userId } }),
    tx.event.findMany({
      where: { groupId, personalDateId: null, people: { some: { personId } } },
    }),
  ]);

  const unused = [...occasions];
  for (const date of dates) {
    const index = unused.findIndex((occasion) => sameOccasion(occasion, date));
    if (index === -1) continue;
    const [occasion] = unused.splice(index, 1);

    await tx.event.deleteMany({ where: { groupId, personalDateId: date.id } });
    await tx.event.update({
      where: { id: occasion.id },
      data: { personalDateId: date.id, adopted: true },
    });
  }
}

/** "That's me": link a user's account to an entry already on the list. */
export async function claimEntry({
  user,
  groupId,
  personId,
}: {
  user: { id: string; name: string };
  groupId: string;
  personId: string;
}): Promise<boolean> {
  if (await hasClaimed(user.id, groupId)) return false;

  return prisma.$transaction(async (tx) => {
    const entry = await tx.person.findFirst({
      where: { id: personId, groupId, userId: null },
    });
    if (!entry) return false;

    // Their own entry, made when they joined, gives way to the older one.
    const own = await tx.person.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    if (own) {
      await moveOccasions(tx, own.id, entry.id);
      await tx.person.delete({ where: { id: own.id } });
    }

    await tx.person.update({
      where: { id: entry.id },
      data: { userId: user.id, claimedName: entry.name, name: user.name },
    });
    await adoptMatchingOccasions(tx, { userId: user.id, groupId, personId: entry.id });
    return true;
  });
}

/** Undo a claim, putting the entry back as it was and the user on their own. */
export async function unclaimEntry({
  groupId,
  personId,
}: {
  groupId: string;
  personId: string;
}): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.person.findFirst({
      where: { id: personId, groupId, userId: { not: null }, claimedName: { not: null } },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!entry?.user) return false;
    const { user } = entry;

    // What the group already had goes back to being the group's.
    await tx.event.updateMany({
      where: { groupId, adopted: true, personalDate: { userId: user.id } },
      data: { adopted: false, personalDateId: null },
    });

    await tx.person.update({
      where: { id: entry.id },
      data: { userId: null, claimedName: null, name: entry.claimedName! },
    });

    const member = await tx.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    if (member) {
      const own = await tx.person.create({ data: { groupId, userId: user.id, name: user.name } });

      // Dates they shared themselves follow them off the entry.
      const shared = await tx.event.findMany({
        where: { groupId, personalDate: { userId: user.id } },
        select: { id: true },
      });
      await tx.eventPerson.deleteMany({
        where: { personId: entry.id, eventId: { in: shared.map((event) => event.id) } },
      });
      await tx.eventPerson.createMany({
        data: shared.map((event) => ({ eventId: event.id, personId: own.id })),
      });
    }
    return true;
  });
}

/**
 * Merge two entries into one. The entry with an account is always the one that
 * stays; two entries that each have an account are two real people.
 */
export async function mergeEntries({
  groupId,
  firstId,
  secondId,
}: {
  groupId: string;
  firstId: string;
  secondId: string;
}): Promise<string | null> {
  if (firstId === secondId) return "Choose two different people.";

  return prisma.$transaction(async (tx) => {
    const entries = await tx.person.findMany({
      where: { groupId, id: { in: [firstId, secondId] } },
    });
    if (entries.length !== 2) return "Those people aren't on this group's list.";
    if (entries.every((entry) => entry.userId)) {
      return "Both of those have their own account, so they can't be merged.";
    }

    const keep = entries.find((entry) => entry.userId) ?? entries.find((e) => e.id === secondId)!;
    const drop = entries.find((entry) => entry.id !== keep.id)!;

    await moveOccasions(tx, drop.id, keep.id);
    await tx.person.delete({ where: { id: drop.id } });
    if (keep.userId) {
      await adoptMatchingOccasions(tx, { userId: keep.userId, groupId, personId: keep.id });
    }
    return null;
  });
}
