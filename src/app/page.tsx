import Link from "next/link";
import { redirect } from "next/navigation";
import { byDay, MiniMonth } from "@/components/calendar";
import { EmptyState } from "@/components/empty-state";
import { ChevronDownIcon, SameDayIcon } from "@/components/icons";
import { Agenda, CalendarDot, DayRows, occasionKey, SameDayNote } from "@/components/occasions";
import { getCurrentUser } from "@/lib/auth/session";
import { monthGrid, WEEKDAYS_SHORT } from "@/lib/calendar/grid";
import { getMyGroups, type MyGroup } from "@/lib/groups/access";
import {
  addDays,
  dayOfWeek,
  daysBetween,
  GREGORIAN_MONTHS,
  toISODate,
} from "@/lib/hijri/hijri";
import { GROUP_TYPE_EMOJI } from "@/lib/occasions/labels";
import {
  getOccasionsBetween,
  getUpcoming,
  type UpcomingOccasion,
} from "@/lib/occasions/queries";
import { soonestDay } from "@/lib/occasions/same-day";
import { today } from "@/lib/today";

export const dynamic = "force-dynamic";

export default async function UpcomingPage({ searchParams }: PageProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { group } = await searchParams;
  const selectedGroup = typeof group === "string" && group ? group : null;

  const groups = await getMyGroups();

  if (groups.length === 0) {
    return (
      <EmptyState
        emoji="👋"
        title="You're not in a group yet"
        body="Occasions live in groups — a family, a circle of friends, a school year. Start one, or open an invite link someone has sent you."
        action={{ href: "/groups", label: "Create a group" }}
      />
    );
  }

  // A stale ?group= from a group you've left shouldn't be a dead end.
  if (selectedGroup && !groups.some((candidate) => candidate.id === selectedGroup)) {
    redirect("/");
  }

  const now = today();
  const grid = monthGrid({ mode: "gregorian", year: now.year, month: now.month });
  const firstCell = grid.cells[0].gregorian;
  const lastCell = grid.cells[grid.cells.length - 1].gregorian;
  const recentFrom = addDays(now, -30);

  // Everything visible is loaded once across all the user's groups, then
  // narrowed here — so the group counts can be shown alongside a filtered list.
  const [upcomingAll, aroundAll] = await Promise.all([
    getUpcoming({ from: now }),
    getOccasionsBetween({
      from: daysBetween(firstCell, recentFrom) < 0 ? recentFrom : firstCell,
      to: lastCell,
    }),
  ]);

  const inGroup = (occasion: UpcomingOccasion) =>
    selectedGroup === null || occasion.groups.some((group) => group.id === selectedGroup);
  const upcoming = upcomingAll.filter(inGroup);
  const around = aroundAll.filter(inGroup);
  const recent = around
    .filter((occasion) => occasion.occurrence.daysAway < 0 && occasion.occurrence.daysAway >= -30)
    .reverse();

  const showGroup = groups.length > 1 && selectedGroup === null;
  const groupQuery = selectedGroup ? `&group=${selectedGroup}` : "";
  const returnTo = selectedGroup ? `/?group=${selectedGroup}` : "/";

  const countByGroup = new Map<string, number>();
  for (const occasion of upcomingAll) {
    for (const group of occasion.groups) {
      countByGroup.set(group.id, (countByGroup.get(group.id) ?? 0) + 1);
    }
  }

  return (
    <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
      <div className="min-w-0">
        <Overview occasions={upcoming} />

        {groups.length > 1 && (
          <GroupChips
            groups={groups}
            selected={selectedGroup}
            counts={countByGroup}
            total={upcomingAll.length}
          />
        )}

        {recent.length > 0 && (
          <details className="mb-6 border-y border-line">
            <summary className="flex items-center gap-2 py-2.5 text-sm text-muted transition-colors hover:text-ink">
              <span className="eyebrow text-faint">Recently</span>
              <span>
                {recent.length} {recent.length === 1 ? "occasion" : "occasions"} in the last 30 days
              </span>
              <ChevronDownIcon className="chevron ml-auto size-4 text-faint transition-transform" />
            </summary>
            <div className="pb-2">
              <DayRows
                occasions={recent}
                today={now}
                showGroup={showGroup}
                returnTo={returnTo}
                dateLabel="month"
              />
            </div>
          </details>
        )}

        {upcoming.length === 0 ? (
          <EmptyState
            emoji="🎉"
            title="Nothing coming up"
            body="Add the birthdays, anniversaries and milestones. Each one can be observed by the Gregorian calendar, the Hijri one, or both."
            action={{ href: "/events/new", label: "Add an occasion" }}
          />
        ) : (
          <Agenda occasions={upcoming} today={now} showGroup={showGroup} returnTo={returnTo} />
        )}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-8">
          <MiniMonth
            grid={grid}
            occasions={byDay(around)}
            todayIso={toISODate(now)}
            hrefFor={(iso) => `/calendar?d=${iso}${groupQuery}`}
            titleHref={`/calendar${selectedGroup ? `?group=${selectedGroup}` : ""}`}
            showOther
          />

          {groups.length > 1 && (
            <nav aria-label="Filter by group">
              <p className="eyebrow mb-2 text-faint">Groups</p>
              <ul className="space-y-0.5 text-sm">
                <GroupLink href="/" active={selectedGroup === null} count={upcomingAll.length}>
                  All groups
                </GroupLink>
                {groups.map((candidate) => (
                  <GroupLink
                    key={candidate.id}
                    href={`/?group=${candidate.id}`}
                    active={selectedGroup === candidate.id}
                    count={countByGroup.get(candidate.id) ?? 0}
                  >
                    <span aria-hidden="true" className="mr-1.5">
                      {GROUP_TYPE_EMOJI[candidate.type]}
                    </span>
                    {candidate.name}
                  </GroupLink>
                ))}
              </ul>
            </nav>
          )}

          <Legend />
        </div>
      </aside>
    </div>
  );
}

/**
 * The page's headline: what's happening today, or what's next, in a sentence —
 * then the shape of the year ahead in three numbers.
 */
function Overview({ occasions }: { occasions: UpcomingOccasion[] }) {
  const todays = occasions.filter((occasion) => occasion.occurrence.daysAway === 0);
  // Every occasion on the next day with anything on it, however many there are.
  const next = soonestDay(occasions.filter((occasion) => occasion.occurrence.daysAway > 0));
  const nextDay = next[0]?.occurrence;
  const within = (days: number) =>
    occasions.filter((occasion) => occasion.occurrence.daysAway <= days).length;

  return (
    <header className="mb-6">
      <h1 className="font-display text-[2rem] leading-tight font-medium text-ink sm:text-[2.25rem]">
        Coming up
      </h1>

      <p className="mt-1.5 max-w-xl text-[0.95rem] text-muted">
        {todays.length > 0 ? (
          <>
            <span className="font-medium text-today">Mabrook! </span>
            Today is <Names occasions={todays} />.
          </>
        ) : (
          "Nothing today."
        )}
        {nextDay && (
          <>
            {" "}
            {todays.length > 0 ? "After that" : "Next"} {next.length > 1 ? "are" : "is"}{" "}
            <Names occasions={next} />{" "}
            {nextDay.daysAway === 1 ? "tomorrow" : `in ${nextDay.daysAway} days`}, on{" "}
            {WEEKDAYS_SHORT[dayOfWeek(nextDay.gregorian)]} {nextDay.gregorian.day}{" "}
            {GREGORIAN_MONTHS[nextDay.gregorian.month - 1]}.
          </>
        )}
      </p>

      {(todays.length > 1 || next.length > 1) && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {todays.length > 1 && (
            <Link href={`/calendar?d=${toISODate(todays[0].occurrence.gregorian)}`} className="hover:underline">
              <SameDayNote count={todays.length} date={todays[0].occurrence.gregorian} />
            </Link>
          )}
          {next.length > 1 && (
            <Link href={`/calendar?d=${toISODate(nextDay.gregorian)}`} className="hover:underline">
              <SameDayNote count={next.length} date={nextDay.gregorian} />
            </Link>
          )}
        </div>
      )}

      {occasions.length > 0 && (
        <dl className="tnum mt-5 flex divide-x divide-line">
          {[
            { label: "Next 7 days", value: within(7) },
            { label: "Next 30 days", value: within(30) },
            { label: "Next 12 months", value: occasions.length },
          ].map((stat) => (
            <div key={stat.label} className="px-4 first:pl-0 sm:px-5">
              <dt className="eyebrow whitespace-nowrap text-faint">{stat.label}</dt>
              <dd className="font-display mt-0.5 text-2xl font-medium text-ink">{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}

function Names({ occasions }: { occasions: UpcomingOccasion[] }) {
  return (
    <>
      {occasions.map((occasion, index) => (
        <span key={occasionKey(occasion)}>
          {index > 0 && (index === occasions.length - 1 ? " and " : ", ")}
          <span className="font-medium text-ink">{occasion.title}</span>
        </span>
      ))}
    </>
  );
}

function GroupChips({
  groups,
  selected,
  counts,
  total,
}: {
  groups: MyGroup[];
  selected: string | null;
  counts: Map<string, number>;
  total: number;
}) {
  const chip = (active: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
      active
        ? "border-ink bg-ink text-paper"
        : "border-line text-muted hover:border-line-strong hover:text-ink"
    }`;

  return (
    <nav aria-label="Filter by group" className="scroll-row -mx-4 mb-6 overflow-x-auto px-4 lg:hidden">
      <div className="flex gap-1.5">
        <Link href="/" aria-current={selected === null ? "page" : undefined} className={chip(selected === null)}>
          All groups <span className="tnum text-xs opacity-60">{total}</span>
        </Link>
        {groups.map((candidate) => (
          <Link
            key={candidate.id}
            href={`/?group=${candidate.id}`}
            aria-current={selected === candidate.id ? "page" : undefined}
            className={chip(selected === candidate.id)}
          >
            <span aria-hidden="true">{GROUP_TYPE_EMOJI[candidate.type]}</span>
            {candidate.name}
            <span className="tnum text-xs opacity-60">{counts.get(candidate.id) ?? 0}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function GroupLink({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`-mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors ${
          active ? "bg-sunken font-medium text-ink" : "text-muted hover:bg-sunken/60 hover:text-ink"
        }`}
      >
        <span className="truncate">{children}</span>
        <span className="tnum text-xs text-faint">{count}</span>
      </Link>
    </li>
  );
}

/** The key to every date in the app, kept where it's needed rather than in help. */
function Legend() {
  return (
    <div className="space-y-2 border-t border-line pt-5 text-xs text-muted">
      <p className="eyebrow text-faint">Reading the dates</p>
      <p className="flex items-center gap-2">
        <CalendarDot tone="greg" filled /> Counted by the Gregorian calendar
      </p>
      <p className="flex items-center gap-2">
        <CalendarDot tone="hijri" filled /> Counted by the Hijri calendar
      </p>
      <p className="flex items-center gap-2">
        <CalendarDot tone="hijri" filled={false} /> The same day in the other calendar
      </p>
      <p className="flex items-center gap-2 text-clash">
        <SameDayIcon className="-ml-1 size-3.5" /> More than one occasion on a day
      </p>
      <p className="pt-1 text-faint">
        A Hijri anniversary comes about 11 days earlier each Gregorian year.
      </p>
    </div>
  );
}
