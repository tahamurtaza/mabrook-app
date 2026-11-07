import type { EventType } from "@/generated/prisma";

/**
 * Spotting that someone who just joined may already be on a group's list.
 *
 * This only ever produces suggestions for the person to confirm, so it leans
 * generous: a wrong guess costs one tap on "Not me", a missed one leaves a
 * duplicate behind.
 */

export interface DatedOccasion {
  type: EventType;
  gregorianMonth: number;
  gregorianDay: number;
  hijriMonth: number;
  hijriDay: number;
}

/** The same kind of occasion on the same day of either calendar. */
export function sameOccasion(a: DatedOccasion, b: DatedOccasion): boolean {
  if (a.type !== b.type) return false;
  return (
    (a.gregorianMonth === b.gregorianMonth && a.gregorianDay === b.gregorianDay) ||
    (a.hijriMonth === b.hijriMonth && a.hijriDay === b.hijriDay)
  );
}

/**
 * A name reduced to its consonants, because one Arabic name has many English
 * spellings: Husain, Hussain and Hossein all come out as "hsn".
 */
function skeleton(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/[aeiouy]/g, "")
    .replace(/(.)\1+/g, "$1");
}

/**
 * Could two names be the same person? First names have to sound alike, and if
 * both have a last name those must too. Going on any shared word would suggest
 * every Bombaywala to every other Bombaywala.
 */
export function namesAlike(a: string, b: string): boolean {
  const words = (name: string) => name.trim().split(/\s+/).map(skeleton).filter(Boolean);
  const [firstA, ...restA] = words(a);
  const [firstB, ...restB] = words(b);

  if (!firstA || firstA.length < 2 || firstA !== firstB) return false;
  if (restA.length === 0 || restB.length === 0) return true;
  return restA.at(-1) === restB.at(-1);
}

export interface RosterEntry<T extends DatedOccasion> {
  name: string;
  occasions: T[];
}

export type MatchReason = "date" | "name";

/**
 * Which list entries might be this person, likeliest first.
 *
 * A shared date alone only counts for a birthday. Anniversaries are shared by
 * definition, so a husband's anniversary would otherwise suggest his wife.
 */
export function findMatches<T extends DatedOccasion, E extends RosterEntry<T>>(
  me: { name: string; dates: DatedOccasion[] },
  roster: E[],
): { entry: E; reason: MatchReason }[] {
  const shares = (entry: E, onlyBirthdays: boolean) =>
    entry.occasions.some((occasion) =>
      me.dates.some(
        (date) => sameOccasion(date, occasion) && (!onlyBirthdays || date.type === "BIRTHDAY"),
      ),
    );

  const rank = (entry: E): number => {
    const alike = namesAlike(me.name, entry.name);
    if (alike && shares(entry, false)) return 0;
    if (shares(entry, true)) return 1;
    return alike ? 2 : 3;
  };

  return roster
    .map((entry) => ({ entry, rank: rank(entry) }))
    .filter(({ rank }) => rank < 3)
    .sort((a, b) => a.rank - b.rank)
    .map(({ entry, rank }) => ({ entry, reason: rank === 2 ? ("name" as const) : ("date" as const) }));
}
