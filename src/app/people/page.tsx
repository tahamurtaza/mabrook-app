import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PeopleDirectory, type DirectoryGroup } from "@/components/people-directory";
import { getCurrentUser } from "@/lib/auth/session";
import { formatGregorian, formatHijri, toISODate } from "@/lib/hijri/hijri";
import { describeYears, EVENT_TYPE_EMOJI, GROUP_TYPE_EMOJI } from "@/lib/occasions/labels";
import { nextOccurrence } from "@/lib/occasions/occurrence";
import { getPeopleByGroup } from "@/lib/occasions/queries";
import { today } from "@/lib/today";

export const dynamic = "force-dynamic";
export const metadata = { title: "People — Mabrook" };

export default async function PeoplePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const now = today();
  const groups = await getPeopleByGroup();

  const directory: DirectoryGroup[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    emoji: GROUP_TYPE_EMOJI[group.type],
    people: group.people.map((person) => {
      const occasions = person.events.map(({ event }) => {
        const next = event.recurring ? nextOccurrence(event, now) : null;
        return {
          id: event.id,
          title: event.title,
          emoji: EVENT_TYPE_EMOJI[event.type],
          originGregorian: formatGregorian({
            year: event.gregorianYear,
            month: event.gregorianMonth,
            day: event.gregorianDay,
          }),
          originHijri: formatHijri({
            year: event.hijriYear,
            month: event.hijriMonth,
            day: event.hijriDay,
          }),
          observed: event.observedCalendar,
          next: next && {
            gregorian: formatGregorian(next.gregorian),
            hijri: formatHijri(next.hijri),
            iso: toISODate(next.gregorian),
            daysAway: next.daysAway,
            years: describeYears(event.type, next),
            anchor: next.anchor,
          },
        };
      });

      const days = occasions.flatMap((occasion) => (occasion.next ? [occasion.next.daysAway] : []));
      return {
        id: person.id,
        name: person.name,
        occasions: occasions.sort(
          (a, b) => (a.next?.daysAway ?? Infinity) - (b.next?.daysAway ?? Infinity),
        ),
        soonest: days.length ? Math.min(...days) : null,
      };
    }),
  }));

  const peopleCount = directory.reduce((sum, group) => sum + group.people.length, 0);

  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <h1 className="font-display text-[2rem] leading-tight font-medium text-ink sm:text-[2.25rem]">
          People
        </h1>
        <p className="mt-1.5 max-w-xl text-[0.95rem] text-muted">
          {peopleCount} {peopleCount === 1 ? "person" : "people"} across {directory.length}{" "}
          {directory.length === 1 ? "group" : "groups"}. Each group keeps its own list, so the
          same person can appear under more than one.
        </p>
      </header>

      {groups.length === 0 ? (
        <EmptyState
          emoji="🧑‍🤝‍🧑"
          title="No people yet"
          body="People are added along with their first occasion, inside a group."
          action={{ href: "/groups", label: "Create a group" }}
        />
      ) : (
        <PeopleDirectory groups={directory} />
      )}
    </div>
  );
}
