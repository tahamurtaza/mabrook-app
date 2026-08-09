import Link from "next/link";
import { redirect } from "next/navigation";
import { OccasionRow } from "@/components/occasion-row";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyGroups, NotAMemberError } from "@/lib/groups/access";
import {
  formatGregorian,
  formatHijri,
  GREGORIAN_MONTHS,
  gregorianToHijri,
  HIJRI_MONTHS_SHORT,
} from "@/lib/hijri/hijri";
import { GROUP_TYPE_EMOJI } from "@/lib/occasions/labels";
import { getUpcoming, type UpcomingOccasion } from "@/lib/occasions/queries";
import { today } from "@/lib/today";

export const dynamic = "force-dynamic";

export default async function UpcomingPage({ searchParams }: PageProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { group } = await searchParams;
  const selectedGroup = typeof group === "string" && group ? group : null;

  const groups = await getMyGroups();
  const now = today();
  const nowHijri = gregorianToHijri(now);

  if (groups.length === 0) return <NoGroups />;

  let occasions: UpcomingOccasion[];
  try {
    occasions = await getUpcoming({ groupId: selectedGroup, from: now });
  } catch (error) {
    // A stale ?group= from a group you've left shouldn't be a dead end.
    if (error instanceof NotAMemberError) redirect("/");
    throw error;
  }

  const months = groupByMonth(occasions);

  return (
    <div>
      <header className="mb-5">
        <h1
          className="text-2xl tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Coming up
        </h1>
        <p className="tnum mt-1 text-sm text-muted">
          Today is {formatGregorian(now, "long")} · {formatHijri(nowHijri, "long")}
        </p>
      </header>

      {groups.length > 1 && (
        <nav className="mb-6 flex flex-wrap gap-1.5" aria-label="Filter by group">
          <FilterChip href="/" active={selectedGroup === null}>
            All groups
          </FilterChip>
          {groups.map((candidate) => (
            <FilterChip
              key={candidate.id}
              href={`/?group=${candidate.id}`}
              active={selectedGroup === candidate.id}
            >
              <span aria-hidden="true" className="mr-1">
                {GROUP_TYPE_EMOJI[candidate.type]}
              </span>
              {candidate.name}
            </FilterChip>
          ))}
        </nav>
      )}

      {occasions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {months.map((month) => (
            <section key={month.key}>
              <h2 className="mb-3 flex items-baseline gap-2 border-b border-line pb-1.5">
                <span className="text-sm font-semibold tracking-wide text-ink">
                  {month.label}
                </span>
                <span className="text-xs text-faint">{month.hijriLabel}</span>
              </h2>
              <ul className="space-y-2.5">
                {month.occasions.map((occasion) => (
                  <OccasionRow
                    key={`${occasion.id}-${occasion.occurrence.gregorian.year}-${occasion.occurrence.gregorian.month}-${occasion.occurrence.gregorian.day}`}
                    occasion={occasion}
                    showGroup={groups.length > 1 && selectedGroup === null}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? "border-accent bg-accent-soft font-medium text-accent-text"
          : "border-line bg-raised text-muted hover:border-line-strong hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function NoGroups() {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-raised px-6 py-12 text-center">
      <p className="text-3xl" aria-hidden="true">
        👋
      </p>
      <h2 className="mt-3 font-medium text-ink">You&apos;re not in a group yet</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
        Occasions live in groups — a family, a circle of friends, a school year.
        Start one, or open an invite link someone has sent you.
      </p>
      <Link
        href="/groups"
        className="mt-5 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Create a group
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-raised px-6 py-12 text-center">
      <p className="text-3xl" aria-hidden="true">
        🎉
      </p>
      <h2 className="mt-3 font-medium text-ink">Nothing coming up</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
        Add the birthdays, anniversaries and milestones. Each one can be
        observed by the Gregorian or the Hijri calendar.
      </p>
      <Link
        href="/events/new"
        className="mt-5 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Add an occasion
      </Link>
    </div>
  );
}

interface MonthGroup {
  key: string;
  label: string;
  hijriLabel: string;
  occasions: UpcomingOccasion[];
}

/**
 * Group by the Gregorian month each occasion lands in, and caption each month
 * with the Hijri month or two it spans — so a reader following the Hijri
 * calendar can still orient themselves.
 */
function groupByMonth(occasions: UpcomingOccasion[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();

  for (const occasion of occasions) {
    const { year, month } = occasion.occurrence.gregorian;
    const key = `${year}-${String(month).padStart(2, "0")}`;

    let month_ = groups.get(key);
    if (!month_) {
      const start = gregorianToHijri({ year, month, day: 1 });
      const end = gregorianToHijri({ year, month, day: 28 });
      const hijriLabel =
        start.month === end.month
          ? `${HIJRI_MONTHS_SHORT[start.month]} ${start.year}`
          : `${HIJRI_MONTHS_SHORT[start.month]} – ${HIJRI_MONTHS_SHORT[end.month]} ${end.year}`;

      month_ = {
        key,
        label: `${GREGORIAN_MONTHS[month - 1]} ${year}`,
        hijriLabel,
        occasions: [],
      };
      groups.set(key, month_);
    }
    month_.occasions.push(occasion);
  }

  return [...groups.values()];
}
