import type { EventType, GroupRole, GroupType } from "@/generated/prisma";

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

/**
 * How to word the count of years for each type. A birthday gives an age; an
 * anniversary gives an ordinal.
 */
export function describeYears(type: EventType, years: number | null): string | null {
  if (years === null || years <= 0) return null;
  if (type === "BIRTHDAY") return `Turning ${years}`;
  return `${ordinal(years)} year`;
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}
