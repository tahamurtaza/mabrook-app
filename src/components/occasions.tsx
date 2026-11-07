import Link from "next/link";
import { deleteEvent } from "@/app/actions/events";
import { WEEKDAYS_LONG, WEEKDAYS_SHORT } from "@/lib/calendar/grid";
import {
  dayOfWeek,
  formatGregorian,
  formatHijri,
  GREGORIAN_MONTHS,
  gregorianToHijri,
  HIJRI_MONTHS_SHORT,
  toISODate,
  type GregorianDate,
  type HijriDate,
} from "@/lib/hijri/hijri";
import {
  describeYears,
  EVENT_TYPE_EMOJI,
  EVENT_TYPE_LABELS,
  GROUP_TYPE_EMOJI,
} from "@/lib/occasions/labels";
import type { ObservedCalendar, Occurrence } from "@/lib/occasions/occurrence";
import type { UpcomingOccasion } from "@/lib/occasions/queries";
import { groupByDay } from "@/lib/occasions/same-day";
import { laterTurns } from "@/lib/occasions/turns";
import { ConfirmSubmit } from "./confirm-submit";
import { ChevronDownIcon, SameDayIcon, SunsetIcon } from "./icons";

/**
 * How occasions are drawn, everywhere they appear.
 *
 * One occasion is one row: the day on the left, what and who in the middle,
 * both calendar dates in their own column, and how far away it is on the
 * right. Everything else — how it recurs, its original date, its next few
 * turns, notes, delete — opens in place beneath the row, so nothing needs a
 * page of its own.
 */

export function countedBy(anchor: ObservedCalendar) {
  return {
    gregorian: anchor === "GREGORIAN" || anchor === "BOTH",
    hijri: anchor === "HIJRI" || anchor === "BOTH",
  };
}

/** A filled dot for the calendar a turn is counted in, hollow for reference. */
export function CalendarDot({ tone, filled }: { tone: "greg" | "hijri"; filled: boolean }) {
  const colour = tone === "greg" ? "border-greg bg-greg" : "border-hijri bg-hijri";
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-1.5 shrink-0 rounded-full border ${
        filled ? colour : "border-line-strong bg-transparent"
      }`}
    />
  );
}

/**
 * The same day in both calendars. The one the occasion is counted by is in
 * its colour; the other is there for reference, in grey.
 */
export function DualDate({
  gregorian,
  hijri,
  anchor,
  stacked = false,
  long = false,
}: {
  gregorian: GregorianDate;
  hijri: HijriDate;
  anchor: ObservedCalendar;
  stacked?: boolean;
  long?: boolean;
}) {
  const by = countedBy(anchor);
  const style = long ? "long" : "short";

  return (
    <span
      className={`tnum ${stacked ? "flex flex-col gap-1" : "inline-flex flex-wrap items-center gap-x-3 gap-y-1"}`}
    >
      <span className={`inline-flex items-center gap-1.5 ${by.gregorian ? "font-medium text-greg" : "text-faint"}`}>
        <CalendarDot tone="greg" filled={by.gregorian} />
        {formatGregorian(gregorian, style)}
      </span>
      <span className={`inline-flex items-center gap-1.5 ${by.hijri ? "font-medium text-hijri" : "text-faint"}`}>
        <CalendarDot tone="hijri" filled={by.hijri} />
        {formatHijri(hijri, style)}
      </span>
    </span>
  );
}

/** "Today", "Tomorrow", a count of days, or months once it's far off. */
export function DaysAway({ days }: { days: number }) {
  if (days === 0) return <span className="eyebrow text-today">Today</span>;
  if (days === 1) return <span className="text-sm font-medium text-ink">Tomorrow</span>;
  if (days === -1) return <span className="text-xs text-faint">Yesterday</span>;
  if (days < 0) return <span className="tnum text-xs text-faint">{-days} days ago</span>;

  const far = days > 60;
  const value = far ? Math.round(days / 30.44) : days;
  const unit = far ? (value === 1 ? "month" : "months") : days === 1 ? "day" : "days";

  return (
    <span
      className="tnum flex flex-col items-end leading-none"
      title={`In ${days} days`}
    >
      <span className={`font-display text-xl ${days <= 7 ? "text-ink" : "text-muted"}`}>
        {value}
      </span>
      <span className="mt-1 text-[0.65rem] tracking-wide text-faint">{unit}</span>
    </span>
  );
}

/** The day, set like a desk calendar: weekday over a large numeral. */
function DateColumn({
  date,
  isToday,
  muted,
  label = "weekday",
}: {
  date: GregorianDate;
  isToday: boolean;
  muted: boolean;
  label?: "weekday" | "month";
}) {
  return (
    <div
      className={`tnum flex flex-col items-center leading-none ${
        isToday ? "text-today" : muted ? "text-faint" : "text-ink"
      }`}
    >
      <span className="eyebrow !text-[0.6rem] opacity-80">
        {label === "month"
          ? GREGORIAN_MONTHS[date.month - 1].slice(0, 3)
          : WEEKDAYS_SHORT[dayOfWeek(date)]}
      </span>
      <span className="font-display mt-1 text-[1.65rem] font-medium">{date.day}</span>
    </div>
  );
}

export interface AgendaItemProps {
  occasion: UpcomingOccasion;
  today: GregorianDate;
  /** Off inside a single group's own page, where the label would be noise. */
  showGroup?: boolean;
  /** Where to land after deleting — the page the row is on. */
  returnTo: string;
  /** Label the date with its month instead of its weekday. */
  dateLabel?: "weekday" | "month";
  /** Start expanded. */
  open?: boolean;
}

export function AgendaItem({
  occasion,
  today,
  showGroup = false,
  returnTo,
  dateLabel = "weekday",
  open = false,
}: AgendaItemProps) {
  const { occurrence } = occasion;
  const isToday = occurrence.daysAway === 0;
  const isPast = occurrence.daysAway < 0;
  const years = describeYears(occasion.type, occurrence);
  const who = occasion.people.map((person) => person.name).join(" & ");

  return (
    <li>
      <details open={open}>
        <summary
          className={`relative -mx-3 grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg px-3 py-3 transition-colors hover:bg-sunken/70 sm:grid-cols-[3rem_minmax(0,1fr)_12rem_4.75rem] ${
            isToday ? "bg-today-soft/60 hover:bg-today-soft" : ""
          }`}
        >
          <DateColumn
            date={occurrence.gregorian}
            isToday={isToday}
            muted={isPast}
            label={dateLabel}
          />

          <div className="min-w-0">
            <p className={`flex items-center gap-2 font-medium ${isPast ? "text-muted" : "text-ink"}`}>
              <span aria-hidden="true" className="text-[0.95rem]">
                {EVENT_TYPE_EMOJI[occasion.type]}
              </span>
              <span className="truncate">{occasion.title}</span>
            </p>
            <p className="mt-0.5 truncate text-sm text-muted">
              {who || EVENT_TYPE_LABELS[occasion.type]}
              {years && <span className="text-ink-soft"> · {years}</span>}
              {showGroup && (
                <span className="text-faint">
                  {" · "}
                  {occasion.groups.length > 2 ? (
                    `${occasion.groups.length} groups`
                  ) : (
                    occasion.groups.map((group, index) => (
                      <span key={group.id}>
                        {index > 0 && " + "}
                        <span aria-hidden="true">{GROUP_TYPE_EMOJI[group.type]} </span>
                        {group.name}
                      </span>
                    ))
                  )}
                </span>
              )}
            </p>
            <p className="mt-1.5 text-xs sm:hidden">
              <DualDate
                gregorian={occurrence.gregorian}
                hijri={occurrence.hijri}
                anchor={occurrence.anchor}
              />
            </p>
          </div>

          <div className="hidden text-xs sm:block">
            <DualDate
              gregorian={occurrence.gregorian}
              hijri={occurrence.hijri}
              anchor={occurrence.anchor}
              stacked
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <DaysAway days={occurrence.daysAway} />
            <ChevronDownIcon className="chevron hidden size-4 text-faint transition-transform duration-200 sm:block" />
          </div>
        </summary>

        <OccasionDetails occasion={occasion} today={today} returnTo={returnTo} />
      </details>
    </li>
  );
}

function recurrenceText(occasion: UpcomingOccasion): React.ReactNode {
  if (!occasion.recurring) return "Once — it doesn't come round again";

  const { gregorian, hijri } = occasion.origin;
  const gregorianDay = `${gregorian.day} ${GREGORIAN_MONTHS[gregorian.month - 1]}`;
  const hijriDay = `${hijri.day} ${HIJRI_MONTHS_SHORT[hijri.month]}`;

  if (occasion.observedCalendar === "GREGORIAN") {
    return (
      <>
        <span className="text-greg">Gregorian</span> · every {gregorianDay}
      </>
    );
  }
  if (occasion.observedCalendar === "HIJRI") {
    return (
      <>
        <span className="text-hijri">Hijri</span> · every {hijriDay}, about 11 days
        earlier each Gregorian year
      </>
    );
  }
  return (
    <>
      <span className="text-greg">Both</span> <span className="text-hijri">calendars</span> ·
      twice a year, on {gregorianDay} and on {hijriDay}
    </>
  );
}

/** The expanded half of a row: everything about the occasion, on one panel. */
export function OccasionDetails({
  occasion,
  today,
  returnTo,
  compact = false,
}: {
  occasion: UpcomingOccasion;
  today: GregorianDate;
  returnTo: string;
  /** For narrow side panels: one column, no indent. */
  compact?: boolean;
}) {
  const { occurrence, origin } = occasion;
  const later = laterTurns(occasion, { today });
  const notes: string[] = [];

  if (occurrence.anchor === "BOTH") {
    notes.push("Both calendars land on the same day this time.");
  }
  if (occurrence.adjusted) {
    notes.push(
      "The original day doesn't exist this year, so it's kept on the nearest day before it.",
    );
  }

  return (
    <div
      className={`mb-3 rounded-lg border border-line px-4 py-3.5 text-sm ${
        compact ? "bg-paper" : "bg-surface sm:ml-[3.75rem]"
      }`}
    >
      <dl className={`grid gap-x-8 gap-y-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        <Fact label="This turn">
          <span className="text-ink">{WEEKDAYS_LONG[dayOfWeek(occurrence.gregorian)]}</span>
          <span className="mt-1 block text-xs">
            <DualDate
              gregorian={occurrence.gregorian}
              hijri={occurrence.hijri}
              anchor={occurrence.anchor}
              long
            />
          </span>
        </Fact>

        <Fact label="Counted by">{recurrenceText(occasion)}</Fact>

        <Fact label="Original date">
          <span className="tnum">
            {formatGregorian(origin.gregorian, "long")}
            <span className="text-faint"> · </span>
            {formatHijri(origin.hijri, "long")}
          </span>
          {occasion.afterSunset && (
            <span className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <SunsetIcon className="size-3.5" />
              After Maghrib, so the Hijri date is the following day
            </span>
          )}
        </Fact>

        {later.length > 0 && (
          <Fact label="Then">
            <ul className="tnum space-y-1">
              {later.map((turn) => (
                <LaterTurn key={toISODate(turn.gregorian)} turn={turn} type={occasion.type} />
              ))}
            </ul>
          </Fact>
        )}

        {occasion.notes && (
          <Fact label="Notes" wide={!compact}>
            <span className="whitespace-pre-line text-ink-soft">{occasion.notes}</span>
          </Fact>
        )}

        {notes.length > 0 && (
          <p className={`text-xs text-muted ${compact ? "" : "sm:col-span-2"}`}>
            {notes.join(" ")}
          </p>
        )}
      </dl>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-xs">
        {occasion.groups.map((group) => (
          <Link
            key={group.id}
            href={`/groups/${group.id}`}
            className="text-muted transition-colors hover:text-ink"
          >
            <span aria-hidden="true">{GROUP_TYPE_EMOJI[group.type]} </span>
            {group.name}
          </Link>
        ))}
        <Link
          href={`/calendar?d=${toISODate(occurrence.gregorian)}`}
          className="text-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
        >
          Show on calendar
        </Link>
        <form action={deleteEvent} className="ml-auto">
          {occasion.ids.map((id) => (
            <input key={id} type="hidden" name="id" value={id} />
          ))}
          <input type="hidden" name="returnTo" value={returnTo} />
          <ConfirmSubmit
            message={`Delete “${occasion.title}”? This removes it for everyone in ${listGroups(occasion.groups)}.`}
            className="rounded-md px-2 py-1 text-faint transition-colors hover:bg-danger-soft hover:text-danger"
          >
            Delete
          </ConfirmSubmit>
        </form>
      </div>
    </div>
  );
}

function LaterTurn({ turn, type }: { turn: Occurrence; type: UpcomingOccasion["type"] }) {
  const by = countedBy(turn.anchor);
  const years = describeYears(type, turn);
  return (
    <li className="flex flex-wrap items-center gap-x-2 text-xs">
      <span className="inline-flex gap-0.5">
        {by.gregorian && <CalendarDot tone="greg" filled />}
        {by.hijri && <CalendarDot tone="hijri" filled />}
      </span>
      <span className="text-ink">{formatGregorian(turn.gregorian)}</span>
      <span className="text-faint">{formatHijri(turn.hijri)}</span>
      {years && <span className="text-muted">· {years}</span>}
    </li>
  );
}

function Fact({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="eyebrow mb-1 text-faint">{label}</dt>
      <dd className="text-ink-soft">{children}</dd>
    </div>
  );
}

export interface MonthBucket {
  key: string;
  month: string;
  year: number;
  span: string;
  occasions: UpcomingOccasion[];
}

/**
 * Group by the Gregorian month each occasion lands in, and caption each month
 * with the Hijri month or two it spans — so a reader following the Hijri
 * calendar can still orient themselves.
 */
export function groupByMonth(occasions: UpcomingOccasion[]): MonthBucket[] {
  const buckets = new Map<string, MonthBucket>();

  for (const occasion of occasions) {
    const { year, month } = occasion.occurrence.gregorian;
    const key = `${year}-${String(month).padStart(2, "0")}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      const start = gregorianToHijri({ year, month, day: 1 });
      const end = gregorianToHijri({ year, month, day: 28 });
      const span =
        start.month === end.month
          ? `${HIJRI_MONTHS_SHORT[start.month]} ${start.year}`
          : start.year === end.year
            ? `${HIJRI_MONTHS_SHORT[start.month]} – ${HIJRI_MONTHS_SHORT[end.month]} ${end.year}`
            : `${HIJRI_MONTHS_SHORT[start.month]} ${start.year} – ${HIJRI_MONTHS_SHORT[end.month]} ${end.year}`;

      bucket = { key, month: GREGORIAN_MONTHS[month - 1], year, span, occasions: [] };
      buckets.set(key, bucket);
    }
    bucket.occasions.push(occasion);
  }

  return [...buckets.values()];
}

/** A month heading that sticks under the header while its rows scroll past. */
export function MonthHeading({ bucket }: { bucket: MonthBucket }) {
  return (
    <h2 className="sticky top-14 z-10 flex items-baseline gap-2.5 border-b border-line bg-paper/95 py-2.5 backdrop-blur-sm">
      <span className="font-display text-lg font-medium text-ink">{bucket.month}</span>
      <span className="tnum text-sm text-faint">{bucket.year}</span>
      <span className="text-xs text-hijri">{bucket.span}</span>
      <span className="tnum ml-auto text-xs text-faint">
        {bucket.occasions.length} {bucket.occasions.length === 1 ? "occasion" : "occasions"}
      </span>
    </h2>
  );
}

/**
 * "2 occasions on the same day", for anywhere a clash needs saying out loud.
 * Plum means this and nothing else.
 */
export function SameDayNote({ count, date }: { count: number; date?: GregorianDate }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-clash">
      <SameDayIcon className="size-3.5 shrink-0" />
      {count} occasions on the same day
      {date && (
        <span className="tnum font-normal">
          · {WEEKDAYS_SHORT[dayOfWeek(date)]} {date.day} {GREGORIAN_MONTHS[date.month - 1].slice(0, 3)}
        </span>
      )}
    </span>
  );
}

/**
 * Rows of occasions, with any that share a day gathered under one band so a
 * clash can't be mistaken for two unrelated rows.
 */
export function DayRows({
  occasions,
  ...row
}: { occasions: UpcomingOccasion[] } & Omit<AgendaItemProps, "occasion">) {
  return (
    <ul className="divide-y divide-line/70">
      {groupByDay(occasions).map((day) =>
        day.length === 1 ? (
          <AgendaItem key={occasionKey(day[0])} occasion={day[0]} {...row} />
        ) : (
          <li key={occasionKey(day[0])} className="-mx-3 my-1 rounded-lg bg-clash-soft/70 px-3 pt-2.5">
            <SameDayNote count={day.length} date={day[0].occurrence.gregorian} />
            <ul className="divide-y divide-line/70">
              {day.map((occasion) => (
                <AgendaItem key={occasionKey(occasion)} occasion={occasion} {...row} />
              ))}
            </ul>
          </li>
        ),
      )}
    </ul>
  );
}

/** A month-grouped list of occasions. */
export function Agenda({
  occasions,
  today,
  showGroup,
  returnTo,
}: {
  occasions: UpcomingOccasion[];
  today: GregorianDate;
  showGroup: boolean;
  returnTo: string;
}) {
  return (
    <div className="space-y-6">
      {groupByMonth(occasions).map((bucket) => (
        <section key={bucket.key}>
          <MonthHeading bucket={bucket} />
          <DayRows
            occasions={bucket.occasions}
            today={today}
            showGroup={showGroup}
            returnTo={returnTo}
          />
        </section>
      ))}
    </div>
  );
}

function listGroups(groups: { name: string }[]): string {
  const names = groups.map((group) => group.name);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
}

export function occasionKey(occasion: UpcomingOccasion): string {
  return `${occasion.id}-${toISODate(occasion.occurrence.gregorian)}`;
}
