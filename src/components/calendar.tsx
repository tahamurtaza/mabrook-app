import Link from "next/link";
import {
  HIJRI_MONTHS_ARABIC,
  monthTitle,
  WEEKDAYS_LONG,
  WEEKDAYS_SHORT,
  type CalendarMode,
  type DayCell,
  type MonthGrid,
} from "@/lib/calendar/grid";
import { notableDay } from "@/lib/calendar/notable";
import {
  addDays,
  dayOfWeek,
  daysBetween,
  GREGORIAN_MONTHS,
  HIJRI_MONTHS_LONG,
  HIJRI_MONTHS_SHORT,
  type GregorianDate,
} from "@/lib/hijri/hijri";
import { describeYears, EVENT_TYPE_EMOJI, EVENT_TYPE_LABELS } from "@/lib/occasions/labels";
import type { ObservedCalendar } from "@/lib/occasions/occurrence";
import type { UpcomingOccasion } from "@/lib/occasions/queries";
import { CrescentIcon, PlusIcon, SameDayIcon, SunsetIcon } from "./icons";
import {
  CalendarDot,
  DaysAway,
  DualDate,
  occasionKey,
  OccasionDetails,
  SameDayNote,
} from "./occasions";

export type OccasionsByDay = Map<string, UpcomingOccasion[]>;

export function byDay(occasions: UpcomingOccasion[]): OccasionsByDay {
  const map: OccasionsByDay = new Map();
  for (const occasion of occasions) {
    const { year, month, day } = occasion.occurrence.gregorian;
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const list = map.get(iso);
    if (list) list.push(occasion);
    else map.set(iso, [occasion]);
  }
  return map;
}

/** The day number in the grid's own calendar, and the other one beside it. */
function dayNumbers(mode: CalendarMode, cell: DayCell) {
  const primary = mode === "gregorian" ? cell.gregorian.day : cell.hijri.day;
  const otherDay = mode === "gregorian" ? cell.hijri.day : cell.gregorian.day;
  const otherMonth =
    mode === "gregorian"
      ? HIJRI_MONTHS_SHORT[cell.hijri.month]
      : GREGORIAN_MONTHS[cell.gregorian.month - 1].slice(0, 3);
  return { primary, otherDay, otherMonth };
}

const ANCHOR_CHIP: Record<ObservedCalendar, string> = {
  GREGORIAN: "bg-greg-soft text-greg",
  HIJRI: "bg-hijri-soft text-hijri",
  BOTH: "bg-sunken text-ink",
};

/**
 * The month grid.
 *
 * Each day shows its number in the grid's calendar, large, and in the other
 * calendar, small and in that calendar's colour. Where the other calendar
 * turns its month the small number becomes the month's name, and the days
 * after it take a faint band — so you can see exactly where Jumada I hands
 * over to Jumada II inside November, without reading a single date.
 */
export function MonthGridView({
  grid,
  occasions,
  todayIso,
  selectedIso,
  hrefFor,
}: {
  grid: MonthGrid;
  occasions: OccasionsByDay;
  todayIso: string;
  selectedIso: string | null;
  hrefFor: (iso: string) => string;
}) {
  const band = grid.mode === "gregorian" ? "bg-hijri-band" : "bg-greg-band";
  const otherTone = grid.mode === "gregorian" ? "text-hijri" : "text-greg";

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="grid grid-cols-7 border-b border-line bg-sunken/60">
        {WEEKDAYS_SHORT.map((name, index) => (
          <div
            key={name}
            className={`eyebrow py-2 text-center text-faint ${index === 5 ? "text-ink-soft" : ""}`}
          >
            <span className="sm:hidden">{name[0]}</span>
            <span className="hidden sm:inline">{name}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {grid.cells.map((cell, index) => {
          const list = occasions.get(cell.iso) ?? [];
          const notable = notableDay(cell.hijri);
          const isToday = cell.iso === todayIso;
          const isSelected = cell.iso === selectedIso;
          const { primary, otherDay, otherMonth } = dayNumbers(grid.mode, cell);
          const lastColumn = index % 7 === 6;
          const lastRow = index >= grid.cells.length - 7;

          return (
            <Link
              key={cell.iso}
              href={hrefFor(cell.iso)}
              scroll={false}
              aria-current={isSelected ? "date" : undefined}
              aria-label={`${WEEKDAYS_LONG[cell.weekday]} ${cell.gregorian.day} ${GREGORIAN_MONTHS[cell.gregorian.month - 1]}, ${cell.hijri.day} ${HIJRI_MONTHS_LONG[cell.hijri.month]}${list.length === 1 ? ", 1 occasion" : list.length > 1 ? `, ${list.length} occasions on the same day` : ""}${notable ? `, ${notable}` : ""}`}
              className={`relative flex min-h-[4.25rem] flex-col p-1 transition-colors hover:bg-sunken sm:min-h-[6.25rem] sm:p-2 lg:min-h-[7.25rem] ${
                lastColumn ? "" : "border-r"
              } ${lastRow ? "" : "border-b"} border-line ${
                cell.otherMonthIndex % 2 === 1 ? band : ""
              } ${cell.inMonth ? "" : "opacity-45"}`}
            >
              {isSelected && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 ring-2 ring-ink ring-inset"
                />
              )}

              <div className="flex items-start justify-between gap-1">
                <span className="flex items-center gap-0.5">
                  <span
                    className={`font-display tnum flex size-6 items-center justify-center rounded-full text-[0.95rem] leading-none sm:size-7 sm:text-lg ${
                      isToday ? "bg-today font-medium text-white" : "text-ink"
                    }`}
                  >
                    {primary}
                  </span>
                  {list.length > 1 && (
                    <span
                      aria-hidden="true"
                      title={`${list.length} occasions on the same day`}
                      className="tnum flex size-3.5 items-center justify-center rounded-full bg-clash text-[0.58rem] font-semibold text-surface sm:size-4 sm:text-[0.65rem]"
                    >
                      {list.length}
                    </span>
                  )}
                </span>
                <span
                  className={`tnum truncate pt-0.5 text-[0.6rem] leading-none whitespace-nowrap sm:text-[0.7rem] ${otherTone} ${
                    otherDay === 1 ? "font-semibold" : "opacity-80"
                  }`}
                >
                  {otherDay === 1 ? (
                    <>
                      <span className="sm:hidden">1</span>
                      <span className="hidden sm:inline">1 {otherMonth}</span>
                    </>
                  ) : (
                    otherDay
                  )}
                </span>
              </div>

              {notable && (
                <p className="mt-1 flex items-center gap-1 text-[0.68rem] leading-tight text-hijri">
                  <CrescentIcon className="size-2.5 shrink-0" />
                  <span className="hidden truncate sm:inline">{notable}</span>
                </p>
              )}

              {list.length > 0 && (
                <>
                  <ul className="mt-auto hidden space-y-0.5 pt-1 sm:block">
                    {list.slice(0, 3).map((occasion, position) => (
                      <li
                        key={occasionKey(occasion)}
                        className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-[0.7rem] leading-tight ${
                          ANCHOR_CHIP[occasion.occurrence.anchor]
                        } ${position === 2 ? "hidden lg:flex" : ""}`}
                      >
                        <span aria-hidden="true">{EVENT_TYPE_EMOJI[occasion.type]}</span>
                        <span className="truncate">{occasion.title}</span>
                      </li>
                    ))}
                    {list.length > 2 && (
                      <li className="px-1 text-[0.65rem] text-faint lg:hidden">
                        +{list.length - 2} more
                      </li>
                    )}
                    {list.length > 3 && (
                      <li className="hidden px-1 text-[0.65rem] text-faint lg:block">
                        +{list.length - 3} more
                      </li>
                    )}
                  </ul>
                  <span className="mt-auto flex justify-center gap-0.5 pb-0.5 sm:hidden">
                    {list.slice(0, 3).map((occasion) => (
                      <AnchorDot key={occasionKey(occasion)} anchor={occasion.occurrence.anchor} />
                    ))}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function AnchorDot({ anchor }: { anchor: ObservedCalendar }) {
  const colour =
    anchor === "GREGORIAN" ? "bg-greg" : anchor === "HIJRI" ? "bg-hijri" : "bg-ink";
  return <span aria-hidden="true" className={`size-1.5 rounded-full ${colour}`} />;
}

/**
 * A small month: the home page's glance at the weeks ahead, and the tiles of
 * the year view. Days with occasions carry a dot per occasion, coloured by the
 * calendar it's counted in.
 */
export function MiniMonth({
  grid,
  occasions,
  todayIso,
  hrefFor,
  titleHref,
  showOther = false,
}: {
  grid: MonthGrid;
  occasions: OccasionsByDay;
  todayIso: string;
  hrefFor: (iso: string) => string;
  titleHref?: string;
  showOther?: boolean;
}) {
  const otherTone = grid.mode === "gregorian" ? "text-hijri" : "text-greg";
  const title = monthTitle(grid, grid.mode === "gregorian" ? "long" : "short");

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2 whitespace-nowrap">
        {titleHref ? (
          <Link
            href={titleHref}
            className="font-display text-[0.95rem] font-medium text-ink hover:underline"
          >
            {title}
          </Link>
        ) : (
          <span className="font-display text-[0.95rem] font-medium text-ink">{title}</span>
        )}
        <span className={`min-w-0 truncate text-[0.68rem] ${otherTone}`}>{grid.span}</span>
      </div>

      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS_SHORT.map((name) => (
          <span key={name} className="pb-1 text-[0.6rem] font-semibold text-faint">
            {name[0]}
          </span>
        ))}
        {grid.cells.map((cell) => {
          if (!cell.inMonth) return <span key={cell.iso} aria-hidden="true" />;

          const list = occasions.get(cell.iso) ?? [];
          const isToday = cell.iso === todayIso;
          const { primary, otherDay } = dayNumbers(grid.mode, cell);
          const notable = notableDay(cell.hijri);
          const label = list.length
            ? list.map((occasion) => occasion.title).join(", ")
            : (notable ?? undefined);

          return (
            <Link
              key={cell.iso}
              href={hrefFor(cell.iso)}
              title={label}
              className={`tnum flex flex-col items-center rounded-md py-0.5 transition-colors hover:bg-sunken ${
                showOther ? "min-h-11" : "min-h-8"
              }`}
            >
              <span
                className={`flex size-6 items-center justify-center rounded-full text-[0.78rem] leading-none ${
                  isToday
                    ? "bg-today font-semibold text-white"
                    : list.length > 1
                      ? "bg-clash-soft font-semibold text-clash ring-1 ring-clash"
                      : list.length
                        ? "font-semibold text-ink"
                        : "text-ink-soft"
                }`}
              >
                {primary}
              </span>
              {showOther && (
                <span
                  className={`text-[0.55rem] leading-none ${otherTone} ${otherDay === 1 ? "font-bold" : "opacity-70"}`}
                >
                  {otherDay}
                </span>
              )}
              <span className="mt-0.5 flex h-1.5 gap-0.5">
                {list.slice(0, 3).map((occasion) => (
                  <AnchorDot key={occasionKey(occasion)} anchor={occasion.occurrence.anchor} />
                ))}
                {list.length === 0 && notable && (
                  <CrescentIcon className="size-2 text-hijri" />
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Everything about one day: both dates, how far off it is, when its Hijri day
 * actually begins, any notable day, and the occasions on it — with the
 * shortcut to add one there.
 */
export function DayPanel({
  date,
  hijri,
  today,
  occasions,
  addHref,
  returnTo,
}: {
  date: GregorianDate;
  hijri: { year: number; month: number; day: number };
  today: GregorianDate;
  occasions: UpcomingOccasion[];
  addHref: string;
  returnTo: string;
}) {
  const away = daysBetween(today, date);
  const eve = addDays(date, -1);
  const weekday = WEEKDAYS_LONG[dayOfWeek(date)];
  const notable = notableDay(hijri);

  return (
    <section aria-label="Selected day" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-faint">{weekday}</p>
          <p className="font-display tnum mt-1 text-[1.75rem] leading-tight font-medium text-ink">
            {date.day} {GREGORIAN_MONTHS[date.month - 1]}
            <span className="ml-1.5 text-lg text-greg">{date.year}</span>
          </p>
          <p className="tnum mt-0.5 text-[0.95rem] font-medium text-hijri">
            {hijri.day} {HIJRI_MONTHS_LONG[hijri.month]} {hijri.year}
          </p>
          <p lang="ar" dir="rtl" className="mt-0.5 text-left text-sm text-hijri/80">
            {HIJRI_MONTHS_ARABIC[hijri.month]}
          </p>
        </div>
        <span className="shrink-0 pt-1">
          {away === 0 ? (
            <span className="rounded-full bg-today px-2.5 py-1 text-xs font-semibold text-white">
              Today
            </span>
          ) : (
            <span className="tnum text-xs text-muted">
              {away > 0 ? `In ${away} ${away === 1 ? "day" : "days"}` : `${-away} ${away === -1 ? "day" : "days"} ago`}
            </span>
          )}
        </span>
      </div>

      <ul className="mt-3 space-y-1.5 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <SunsetIcon className="size-3.5 shrink-0 text-faint" />
          This Hijri day begins at Maghrib on {WEEKDAYS_SHORT[dayOfWeek(eve)]}{" "}
          {eve.day} {GREGORIAN_MONTHS[eve.month - 1].slice(0, 3)}
        </li>
        {notable && (
          <li className="flex items-center gap-1.5 font-medium text-hijri">
            <CrescentIcon className="size-3 shrink-0" />
            {notable}
          </li>
        )}
        {occasions.length > 1 && (
          <li>
            <SameDayNote count={occasions.length} />
          </li>
        )}
      </ul>

      <div className="mt-4 border-t border-line pt-3">
        {occasions.length === 0 ? (
          <p className="text-sm text-faint">No occasions on this day.</p>
        ) : (
          <ul className="space-y-1">
            {occasions.map((occasion) => (
              <DayOccasion
                key={occasionKey(occasion)}
                occasion={occasion}
                today={today}
                returnTo={returnTo}
                open={occasions.length === 1}
              />
            ))}
          </ul>
        )}

        <Link
          href={addHref}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-sunken"
        >
          <PlusIcon className="size-3.5" />
          Add an occasion on this day
        </Link>
      </div>
    </section>
  );
}

function DayOccasion({
  occasion,
  today,
  returnTo,
  open,
}: {
  occasion: UpcomingOccasion;
  today: GregorianDate;
  returnTo: string;
  open: boolean;
}) {
  const years = describeYears(occasion.type, occasion.occurrence);
  const who = occasion.people.map((person) => person.name).join(" & ");

  return (
    <li>
      <details open={open}>
        <summary className="-mx-2 flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-sunken/70">
          <span aria-hidden="true" className="pt-0.5">
            {EVENT_TYPE_EMOJI[occasion.type]}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-ink">{occasion.title}</span>
            <span className="block text-sm text-muted">
              {who || EVENT_TYPE_LABELS[occasion.type]}
              {years && <span className="text-ink-soft"> · {years}</span>}
            </span>
            <span className="mt-1 block text-xs">
              <DualDate
                gregorian={occasion.occurrence.gregorian}
                hijri={occasion.occurrence.hijri}
                anchor={occasion.occurrence.anchor}
              />
            </span>
          </span>
        </summary>
        <OccasionDetails occasion={occasion} today={today} returnTo={returnTo} compact />
      </details>
    </li>
  );
}

/** One line per occasion, for the year view's running list. */
export function CompactOccasion({
  occasion,
  href,
  sameDay = false,
}: {
  occasion: UpcomingOccasion;
  href: string;
  /** Something else falls on this day too. */
  sameDay?: boolean;
}) {
  const { occurrence } = occasion;
  return (
    <li>
      <Link
        href={href}
        className="-mx-2 grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-sunken"
      >
        <span className="tnum text-xs leading-tight text-muted">
          <span className="block font-medium text-ink">{occurrence.gregorian.day}</span>
          {GREGORIAN_MONTHS[occurrence.gregorian.month - 1].slice(0, 3)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm text-ink">
            <span aria-hidden="true">{EVENT_TYPE_EMOJI[occasion.type]} </span>
            {occasion.title}
          </span>
          <span className="flex items-center gap-1.5 text-[0.7rem] text-faint">
            <CalendarDot tone="greg" filled={occurrence.anchor !== "HIJRI"} />
            <CalendarDot tone="hijri" filled={occurrence.anchor !== "GREGORIAN"} />
            {occurrence.hijri.day} {HIJRI_MONTHS_SHORT[occurrence.hijri.month]}
            {sameDay && (
              <span className="inline-flex items-center gap-1 font-medium text-clash">
                <SameDayIcon className="size-3" />
                Same day
              </span>
            )}
          </span>
        </span>
        <DaysAway days={occurrence.daysAway} />
      </Link>
    </li>
  );
}
