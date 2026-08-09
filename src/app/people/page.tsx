import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { formatGregorian, formatHijri } from "@/lib/hijri/hijri";
import {
  EVENT_TYPE_EMOJI,
  GROUP_TYPE_EMOJI,
  GROUP_TYPE_LABELS,
} from "@/lib/occasions/labels";
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

  return (
    <div>
      <header className="mb-7">
        <h1
          className="text-2xl tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          People
        </h1>
        <p className="mt-1 text-sm text-muted">
          Each group keeps its own list, so the same person can appear under
          more than one.
        </p>
      </header>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-raised px-6 py-12 text-center">
          <p className="text-sm text-muted">
            You&apos;re not in a group yet.{" "}
            <Link href="/groups" className="text-accent-text underline underline-offset-2">
              Create one
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.id}>
              <h2 className="mb-3 flex items-baseline gap-2 border-b border-line pb-1.5">
                <Link
                  href={`/groups/${group.id}`}
                  className="text-sm font-semibold text-ink hover:underline"
                >
                  <span aria-hidden="true" className="mr-1">
                    {GROUP_TYPE_EMOJI[group.type]}
                  </span>
                  {group.name}
                </Link>
                <span className="text-xs text-faint">
                  {GROUP_TYPE_LABELS[group.type]}
                </span>
              </h2>

              {group.people.length === 0 ? (
                <p className="text-sm text-faint">No one on this list yet.</p>
              ) : (
                <ul className="space-y-3">
                  {group.people.map((person) => (
                    <li
                      key={person.id}
                      className="rounded-xl border border-line bg-raised p-4"
                    >
                      <h3 className="font-medium text-ink">{person.name}</h3>

                      {person.events.length === 0 ? (
                        <p className="mt-1 text-sm text-faint">
                          Nothing recorded yet.
                        </p>
                      ) : (
                        <ul className="mt-2.5 space-y-1.5">
                          {person.events.map(({ event }) => {
                            const occurrence = nextOccurrence(event, now);
                            return (
                              <li
                                key={event.id}
                                className="tnum flex flex-wrap items-baseline gap-x-2 text-sm"
                              >
                                <span aria-hidden="true">
                                  {EVENT_TYPE_EMOJI[event.type]}
                                </span>
                                <span className="text-ink">{event.title}</span>
                                <span className="text-xs text-faint">
                                  {formatGregorian({
                                    year: event.gregorianYear,
                                    month: event.gregorianMonth,
                                    day: event.gregorianDay,
                                  })}
                                  {" · "}
                                  {formatHijri({
                                    year: event.hijriYear,
                                    month: event.hijriMonth,
                                    day: event.hijriDay,
                                  })}
                                </span>
                                {event.recurring && (
                                  <span className="text-xs text-muted">
                                    next {formatGregorian(occurrence.gregorian)}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
