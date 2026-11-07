import type { EventType, GroupRole, GroupType } from "@/generated/prisma";
import type { ObservedCalendar, Occurrence } from "./occurrence";

export const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  FAMILY: "Family",
  FRIENDS: "Friends",
  SCHOOL: "School",
  WORK: "Work",
  NEIGHBOURS: "Neighbours",
  OTHER: "Group",
};

export const GROUP_TYPE_EMOJI: Record<GroupType, string> = {
  FAMILY: "🏠",
  FRIENDS: "🫂",
  SCHOOL: "🏫",
  WORK: "🏢",
  NEIGHBOURS: "🏘️",
  OTHER: "👥",
};

export const GROUP_TYPE_ORDER: GroupType[] = [
  "FAMILY",
  "FRIENDS",
  "SCHOOL",
  "WORK",
  "NEIGHBOURS",
  "OTHER",
];

export const GROUP_ROLE_LABELS: Record<GroupRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  BIRTHDAY: "Birthday",
  ANNIVERSARY: "Anniversary",
  ENGAGEMENT: "Engagement",
  NIKAH: "Nikah",
  NEW_HOME: "New home",
  NEW_JOB: "New job",
  NEW_OFFICE: "New office",
  SCHOOL_START: "Started school",
  GRADUATION: "Graduation",
  OTHER: "Occasion",
};

/** Emoji read faster than icons in a long mixed list, and cost nothing. */
export const EVENT_TYPE_EMOJI: Record<EventType, string> = {
  BIRTHDAY: "🎂",
  ANNIVERSARY: "💍",
  ENGAGEMENT: "💐",
  NIKAH: "🤝",
  NEW_HOME: "🏡",
  NEW_JOB: "💼",
  NEW_OFFICE: "🏢",
  SCHOOL_START: "🎒",
  GRADUATION: "🎓",
  OTHER: "✨",
};

/** The order the picker offers them in — commonest first. */
export const EVENT_TYPE_ORDER: EventType[] = [
  "BIRTHDAY",
  "ANNIVERSARY",
  "NIKAH",
  "ENGAGEMENT",
  "GRADUATION",
  "SCHOOL_START",
  "NEW_JOB",
  "NEW_HOME",
  "NEW_OFFICE",
  "OTHER",
];

export const OBSERVED_CALENDAR_LABELS: Record<ObservedCalendar, string> = {
  GREGORIAN: "Gregorian",
  HIJRI: "Hijri",
  BOTH: "both calendars",
};

/** What someone calls one of their own dates: "Birthday", "Our first home". */
export function personalDateLabel(date: { type: EventType; label: string | null }): string {
  return date.label || EVENT_TYPE_LABELS[date.type];
}

/** The title a personal date takes on a group's calendar, where it needs a name. */
export function personalDateTitle(
  name: string,
  date: { type: EventType; label: string | null; observedCalendar: ObservedCalendar },
): string {
  if (date.type === "OTHER") return date.label ? `${name}: ${date.label}` : `${name}'s occasion`;
  if (date.type === "SCHOOL_START") return `${name} started school`;
  if (date.type === "BIRTHDAY") return `${name}'s ${birthdayWord(date.observedCalendar)}`;
  return `${name}'s ${EVENT_TYPE_LABELS[date.type].toLowerCase()}`;
}

/**
 * What a birthday is called. Waras is the Hijri word for it, so a birthday kept
 * by the Hijri calendar is a Waras. Anyone kept by both stays a birthday, the
 * word a Gregorian reader expects.
 */
export function birthdayWord(observed: ObservedCalendar): string {
  return observed === "HIJRI" ? "Waras" : "birthday";
}

/**
 * How to word the count of years for each type. A birthday gives an age; an
 * anniversary gives an ordinal.
 *
 * Counts are per calendar, and they differ — a Hijri year is ~11 days shorter,
 * so someone turning 18 by the Gregorian calendar is turning 19 by the Hijri
 * one. On an occurrence anchored to both, both are worth showing.
 */
export function describeYears(
  type: EventType,
  occurrence: Pick<Occurrence, "anchor" | "years">,
): string | null {
  const { gregorian, hijri } = occurrence.years;

  if (occurrence.anchor === "BOTH" && gregorian && hijri && gregorian > 0) {
    return type === "BIRTHDAY"
      ? `Turning ${gregorian} · ${hijri} Hijri`
      : `${ordinal(gregorian)} year · ${ordinal(hijri)} Hijri`;
  }

  const years = occurrence.anchor === "HIJRI" ? hijri : gregorian;
  if (years === null || years <= 0) return null;

  if (type === "BIRTHDAY") return `Turning ${years}`;
  return `${ordinal(years)} year`;
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}
