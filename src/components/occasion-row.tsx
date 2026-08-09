import Link from "next/link";
import {
  formatGregorian,
  formatHijri,
  GREGORIAN_MONTHS,
} from "@/lib/hijri/hijri";
import {
  describeYears,
  EVENT_TYPE_EMOJI,
  GROUP_TYPE_EMOJI,
} from "@/lib/occasions/labels";
import { describeDaysAway } from "@/lib/occasions/occurrence";
import type { UpcomingOccasion } from "@/lib/occasions/queries";

export function OccasionRow({
  occasion,
  showGroup = true,
}: {
  occasion: UpcomingOccasion;
  /** Off inside a single group's own page, where the label would be noise. */
  showGroup?: boolean;
}) {
  const { occurrence } = occasion;
  const isToday = occurrence.daysAway === 0;
  const isHijri = occasion.observedCalendar === "HIJRI";
  const years = describeYears(occasion.type, occurrence.yearsCompleted);

  return (
    <li
      className={`flex gap-4 rounded-xl border p-3.5 transition-colors sm:gap-5 ${
        isToday
          ? "border-today/40 bg-today-soft"
          : "border-line bg-raised hover:border-line-strong"
      }`}
    >
      {/* Date block: the day this occasion actually lands on. */}
      <div
        className={`tnum flex w-14 shrink-0 flex-col items-center justify-center rounded-lg py-2 ${
          isToday ? "bg-today text-white" : "bg-sunken text-ink"
        }`}
      >
        <span className="text-xl leading-none font-semibold">
          {occurrence.gregorian.day}
        </span>
        <span className="mt-0.5 text-[11px] uppercase tracking-wide opacity-70">
          {GREGORIAN_MONTHS[occurrence.gregorian.month - 1].slice(0, 3)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-medium text-ink">
              <span aria-hidden="true" className="mr-1.5">
                {EVENT_TYPE_EMOJI[occasion.type]}
              </span>
              {occasion.title}
            </h3>

            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
              {occasion.people.length > 0 && (
                <span className="truncate">
                  {occasion.people.map((person) => person.name).join(" & ")}
                </span>
              )}
              {showGroup && (
                <Link
                  href={`/groups/${occasion.group.id}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sunken px-2 py-0.5 text-xs text-muted transition-colors hover:text-ink"
                >
                  <span aria-hidden="true">
                    {GROUP_TYPE_EMOJI[occasion.group.type]}
                  </span>
                  {occasion.group.name}
                </Link>
              )}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p
              className={`tnum text-sm font-medium ${
                isToday ? "text-today" : "text-muted"
              }`}
            >
              {describeDaysAway(occurrence.daysAway)}
            </p>
            {years && <p className="mt-0.5 text-xs text-faint">{years}</p>}
          </div>
        </div>

        {/* Both calendars, always. The observed one is the one in colour. */}
        <div className="tnum mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span
            className={
              isHijri
                ? "text-faint"
                : "rounded bg-gold-soft px-1.5 py-0.5 font-medium text-gold"
            }
          >
            {formatGregorian(occurrence.gregorian)}
          </span>
          <span className="text-faint" aria-hidden="true">
            ·
          </span>
          <span
            className={
              isHijri
                ? "rounded bg-accent-soft px-1.5 py-0.5 font-medium text-accent-text"
                : "text-faint"
            }
          >
            {formatHijri(occurrence.hijri)}
          </span>

          <span className="text-faint">
            observed by the {isHijri ? "Hijri" : "Gregorian"} calendar
          </span>
        </div>

        {(occurrence.adjusted || occasion.afterSunset) && (
          <p className="mt-1.5 text-xs text-faint">
            {occurrence.adjusted && (
              <>
                The original date doesn&apos;t fall in this year, so it&apos;s
                observed on the nearest day.{" "}
              </>
            )}
            {occasion.afterSunset && <>Recorded as after Maghrib.</>}
          </p>
        )}
      </div>
    </li>
  );
}
