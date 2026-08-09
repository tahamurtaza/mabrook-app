import type { EventType, GroupType } from "@/generated/prisma";
import { prisma } from "@/lib/db";
import { getMyGroupIds, requireMembership } from "@/lib/groups/access";
import { addDays, type GregorianDate } from "@/lib/hijri/hijri";
import { today } from "@/lib/today";
import {
  bySoonest,
  nextOccurrence,
  occurrencesBetween,
  type CalendarSystem,
  type Occurrence,
} from "./occurrence";

export interface UpcomingOccasion {
  id: string;
  title: string;
  type: EventType;
  notes: string | null;
  observedCalendar: CalendarSystem;
  afterSunset: boolean;
  group: { id: string; name: string; type: GroupType };
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
    title: event.title,
    type: event.type,
    notes: event.notes,
    observedCalendar: event.observedCalendar,
    afterSunset: event.afterSunset,
    group: event.group,
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

  return events
    .flatMap((event) =>
      occurrencesBetween(event, from, addDays(from, withinDays))
        .filter((occurrence) => occurrence.daysAway >= 0)
        .map((occurrence) => toOccasion(event, occurrence)),
    )
    .sort(bySoonest);
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
