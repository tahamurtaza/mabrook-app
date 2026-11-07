import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateGroupForm } from "@/components/create-group-form";
import { ChevronRightIcon, SameDayIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyGroups } from "@/lib/groups/access";
import { GREGORIAN_MONTHS } from "@/lib/hijri/hijri";
import {
  EVENT_TYPE_EMOJI,
  GROUP_ROLE_LABELS,
  GROUP_TYPE_EMOJI,
  GROUP_TYPE_LABELS,
} from "@/lib/occasions/labels";
import { describeDaysAway } from "@/lib/occasions/occurrence";
import { getUpcoming, type UpcomingOccasion } from "@/lib/occasions/queries";
import { soonestDay } from "@/lib/occasions/same-day";

export const dynamic = "force-dynamic";
export const metadata = { title: "Groups — Mabrook" };

export default async function GroupsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [groups, upcoming] = await Promise.all([getMyGroups(), getUpcoming()]);

  const byGroup = new Map<string, UpcomingOccasion[]>();
  for (const occasion of upcoming) {
    for (const group of occasion.groups) {
      const list = byGroup.get(group.id) ?? [];
      list.push(occasion);
      byGroup.set(group.id, list);
    }
  }

  return (
    <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        <header className="mb-6">
          <h1 className="font-display text-[2rem] leading-tight font-medium text-ink sm:text-[2.25rem]">
            Groups
          </h1>
          <p className="mt-1.5 max-w-xl text-[0.95rem] text-muted">
            Each group keeps its own calendar and its own list of people. You only see the
            groups you&apos;ve been invited to.
          </p>
        </header>

        {groups.length === 0 ? (
          <p className="border-y border-line py-8 text-center text-sm text-muted">
            You&apos;re not in any groups yet. Start one, or open an invite link someone has
            sent you.
          </p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {groups.map((group) => {
              const list = byGroup.get(group.id) ?? [];
              const next = soonestDay(list);
              const nextDay = next[0]?.occurrence;

              return (
                <li key={group.id}>
                  <Link
                    href={`/groups/${group.id}`}
                    className="group -mx-3 grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-4 rounded-lg px-3 py-4 transition-colors hover:bg-sunken/70"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-11 items-center justify-center rounded-xl bg-sunken text-xl"
                    >
                      {GROUP_TYPE_EMOJI[group.type]}
                    </span>

                    <span className="min-w-0">
                      <span className="font-display block truncate text-lg font-medium text-ink">
                        {group.name}
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {GROUP_TYPE_LABELS[group.type]} · {group.memberCount}{" "}
                        {group.memberCount === 1 ? "member" : "members"} ·{" "}
                        {GROUP_ROLE_LABELS[group.role]}
                      </span>
                      {nextDay && (
                        <span className="mt-1 block text-xs text-faint">
                          Next:{" "}
                          {next.map((occasion, index) => (
                            <span key={occasion.id} className="text-ink-soft">
                              {index > 0 && " + "}
                              <span aria-hidden="true">{EVENT_TYPE_EMOJI[occasion.type]} </span>
                              {occasion.title}
                            </span>
                          ))}{" "}
                          · {nextDay.gregorian.day}{" "}
                          {GREGORIAN_MONTHS[nextDay.gregorian.month - 1].slice(0, 3)} ·{" "}
                          {describeDaysAway(nextDay.daysAway).toLowerCase()}
                          {next.length > 1 && (
                            <span className="ml-1.5 inline-flex items-center gap-1 font-medium whitespace-nowrap text-clash">
                              <SameDayIcon className="size-3" />
                              Same day
                            </span>
                          )}
                        </span>
                      )}
                    </span>

                    <span className="flex items-center gap-3">
                      <span className="tnum hidden flex-col items-end leading-none sm:flex">
                        <span className="font-display text-xl text-ink">{list.length}</span>
                        <span className="mt-1 text-[0.65rem] text-faint">in 12 months</span>
                      </span>
                      <ChevronRightIcon className="size-4 text-faint transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-5 text-xs text-faint">
          Been sent an invite link? Open it and you&apos;ll join once signed in.
        </p>
      </div>

      <section className="self-start rounded-xl border border-line bg-surface p-5 lg:sticky lg:top-20">
        <h2 className="font-display text-lg font-medium text-ink">
          {groups.length === 0 ? "Start your first group" : "Start another group"}
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted">You can invite people once it exists.</p>
        <CreateGroupForm />
      </section>
    </div>
  );
}
