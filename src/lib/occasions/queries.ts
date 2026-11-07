import type { EventType, GroupType } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { getMyGroupIds, requireMembership } from "@/lib/groups/access";
import { addDays, daysBetween, type GregorianDate } from "@/lib/hijri/hijri";
import { today } from "@/lib/today";
import {
  bySoonest,
  nextOccurrence,
  occurrencesBetween,
  type ObservedCalendar,
  type Occurrence,
} from "./occurrence";
import { titleForTurn } from "./labels";

export interface UpcomingOccasion {
  /** The first copy's id. See `ids` for an occasion shared to several groups. */
  id: string;
  /**
   * Every stored copy of this occasion. An occasion shared with several groups
   * is saved once per group (so each group's calendar stays its own), and the
   * merged views fold the copies back into one row.
   */
  ids: string[];
  title: string;
  type: EventType;
  notes: string | null;
  observedCalendar: ObservedCalendar;
  afterSunset: boolean;
  recurring: boolean;
  /** The first group it's in. See `groups` for all of them. */
  group: { id: string; name: string; type: GroupType };
  groups: { id: string; name: string; type: GroupType }[];
  /** The original date, for "since 2008" style captions. */
  origin: {
    gregorian: GregorianDate;
    hijri: { year: number; month: number; day: number };
  };
  people: { id: string; name: string; role: string | null }[];
  occurrence: Occurrence;
}

const eventInclude = {
  group: { select: { id: true, name: true, type: true } },
  people: {
    include: { person: { select: { id: true, name: true } } },
  },
} as const;

type EventRow = Awaited<
  ReturnType<typeof prisma.event.findMany<{ include: typeof eventInclude }>>
>[number];

function toOccasion(event: EventRow, occurrence: Occurrence): UpcomingOccasion {
  return {
    id: event.id,
    ids: [event.id],
    title: titleForTurn(event.title, event.type, occurrence.anchor),
    type: event.type,
    notes: event.notes,
    observedCalendar: event.observedCalendar,
    afterSunset: event.afterSunset,
    recurring: event.recurring,
    group: event.group,
    groups: [event.group],
    origin: {
      gregorian: {
        year: event.gregorianYear,
        month: event.gregorianMonth,
        day: event.gregorianDay,
      },
      hijri: {
        year: event.hijriYear,
        month: event.hijriMonth,
        day: event.hijriDay,
      },
    },
    people: event.people.map((link) => ({
      id: link.person.id,
      name: link.person.name,
      role: link.role,
    })),
    occurrence,
  };
}

/**
 * Fold copies of one occasion shared across several groups into a single row.
 *
 * Copies are recognised by what makes them the same occasion — title, type,
 * original date and calendar — landing on the same day. Only groups the user
 * can read are ever loaded, so the merged row can't name a group they aren't in.
 */
export function mergeShared(occasions: UpcomingOccasion[]): UpcomingOccasion[] {
  const merged = new Map<string, UpcomingOccasion>();

  for (const occasion of occasions) {
    const { gregorian, hijri } = occasion.origin;
    const turn = occasion.occurrence.gregorian;
    const key = [
      occasion.title.trim().toLowerCase(),
      occasion.type,
      occasion.observedCalendar,
      occasion.recurring,
      `${gregorian.year}-${gregorian.month}-${gregorian.day}`,
      `${hijri.year}-${hijri.month}-${hijri.day}`,
      `${turn.year}-${turn.month}-${turn.day}`,
    ].join("|");

    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...occasion, ids: [...occasion.ids], groups: [...occasion.groups] });
      continue;
    }

    existing.ids.push(...occasion.ids);
    existing.groups.push(...occasion.groups);
    existing.notes ??= occasion.notes;
    for (const person of occasion.people) {
      const known = existing.people.some(
        (candidate) => candidate.name.toLowerCase() === person.name.toLowerCase(),
      );
      if (!known) existing.people.push(person);
    }
  }

  return [...merged.values()];
}

/**
 * Resolve which groups a query may read.
 *
 * With no filter it's every group the user belongs to. With one, membership is
 * checked rather than trusted — the id arrives from a query string.
 */
async function readableGroupIds(only?: string | null): Promise<string[]> {
  if (!only) return getMyGroupIds();
  await requireMembership(only);
  return [only];
}

export interface UpcomingOptions {
  /** Narrow to a single group. Membership is verified. */
  groupId?: string | null;
  withinDays?: number;
  from?: GregorianDate;
}

/**
 * Every occasion coming up, merged across the user's groups and sorted soonest
 * first.
 *
 * The recurrence maths can't be pushed into SQL — a Hijri anniversary's next
 * Gregorian date depends on the conversion — so we load the visible rows and
 * project them in memory. A few hundred rows is nothing.
 */
export async function getUpcoming({
  groupId = null,
  withinDays = 365,
  from = today(),
}: UpcomingOptions = {}): Promise<UpcomingOccasion[]> {
  const groupIds = await readableGroupIds(groupId);
  if (groupIds.length === 0) return [];

  const events = await prisma.event.findMany({
    where: { groupId: { in: groupIds } },
    include: eventInclude,
  });

  return mergeShared(
    events.flatMap((event) =>
      occurrencesBetween(event, from, addDays(from, withinDays))
        .filter((occurrence) => occurrence.daysAway >= 0)
        .map((occurrence) => toOccasion(event, occurrence)),
    ),
  ).sort(bySoonest);
}

/**
 * Every turn of every visible occasion between two days, inclusive — what a
 * calendar page or a "recently" list needs. `daysAway` is measured from today,
 * not from `from`, so past turns come back negative.
 */
export async function getOccasionsBetween({
  groupId = null,
  from,
  to,
}: {
  groupId?: string | null;
  from: GregorianDate;
  to: GregorianDate;
}): Promise<UpcomingOccasion[]> {
  const groupIds = await readableGroupIds(groupId);
  if (groupIds.length === 0) return [];

  const events = await prisma.event.findMany({
    where: { groupId: { in: groupIds } },
    include: eventInclude,
  });

  const now = today();
  return mergeShared(
    events.flatMap((event) =>
      occurrencesBetween(event, from, to).map((occurrence) =>
        toOccasion(event, {
          ...occurrence,
          daysAway: daysBetween(now, occurrence.gregorian),
        }),
      ),
    ),
  ).sort(bySoonest);
}

/** Every occasion in a group, each at its next turn. */
export async function getGroupOccasions(
  groupId: string,
  from: GregorianDate = today(),
): Promise<UpcomingOccasion[]> {
  await requireMembership(groupId);

  const events = await prisma.event.findMany({
    where: { groupId },
    include: eventInclude,
  });

  return events
    .map((event) => toOccasion(event, nextOccurrence(event, from)))
    .sort(bySoonest);
}

/** The roster of one group. */
export async function getGroupPeople(groupId: string) {
  await requireMembership(groupId);
  return prisma.person.findMany({
    where: { groupId },
    orderBy: { name: "asc" },
    include: { _count: { select: { events: true } } },
  });
}

/** Rosters of every group the user is in, for the Family page. */
export async function getPeopleByGroup() {
  const groupIds = await getMyGroupIds();
  if (groupIds.length === 0) return [];

  return prisma.group.findMany({
    where: { id: { in: groupIds } },
    orderBy: { name: "asc" },
    include: {
      people: {
        orderBy: { name: "asc" },
        include: { events: { include: { event: true } } },
      },
    },
  });
}
