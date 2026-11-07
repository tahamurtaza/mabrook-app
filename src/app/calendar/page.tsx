import Link from "next/link";
import { redirect } from "next/navigation";
import {
  byDay,
  CompactOccasion,
  DayPanel,
  MiniMonth,
  MonthGridView,
} from "@/components/calendar";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth/session";
import {
  HIJRI_MONTHS_ARABIC,
  monthContaining,
  monthGrid,
  shiftMonth,
  within,
  yearBounds,
  yearMonths,
  type CalendarMode,
  type MonthRef,
} from "@/lib/calendar/grid";
import { getMyGroups } from "@/lib/groups/access";
import {
  fromISODate,
  GREGORIAN_MONTHS,
  gregorianToHijri,
  toISODate,
  type GregorianDate,
} from "@/lib/hijri/hijri";
import { GROUP_TYPE_EMOJI } from "@/lib/occasions/labels";
import { getOccasionsBetween } from "@/lib/occasions/queries";
import { today } from "@/lib/today";

export const dynamic = "force-dynamic";
export const metadata = { title: "Calendar — Mabrook" };

interface View {
  mode: CalendarMode;
  view: "month" | "year";
  y?: number;
  /** 1-12 in the URL for both calendars; Hijri months are 0-11 internally. */
  m?: number;
  d?: string;
  group: string | null;
}

/** Build a calendar URL, leaving out anything that's already the default. */
function calendarHref(view: View): string {
  const params = new URLSearchParams();
  if (view.mode === "hijri") params.set("mode", "hijri");
  if (view.view === "year") params.set("view", "year");
  if (view.y !== undefined) params.set("y", String(view.y));
  if (view.m !== undefined) params.set("m", String(view.m));
  if (view.d) params.set("d", view.d);
  if (view.group) params.set("group", view.group);
  const query = params.toString();
  return query ? `/calendar?${query}` : "/calendar";
}

function parseDay(value: unknown): GregorianDate | null {
  if (typeof value !== "string") return null;
  try {
    const date = fromISODate(value);
    if (date.month < 1 || date.month > 12 || date.day < 1 || date.day > 31) return null;
    return date;
  } catch {
    return null;
  }
}

function parseNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return number >= min && number <= max ? number : undefined;
}

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const mode: CalendarMode = params.mode === "hijri" ? "hijri" : "gregorian";
  const view = params.view === "year" ? "year" : "month";
  const group = typeof params.group === "string" && params.group ? params.group : null;

  const groups = await getMyGroups();
  if (group && !groups.some((candidate) => candidate.id === group)) redirect("/calendar");

  const now = today();
  const todayIso = toISODate(now);
  const requested = parseDay(params.d);
  const year = parseNumber(params.y, 1, 9999);
  const month = parseNumber(params.m, 1, 12);

  const base: View = { mode, view, group };

  const switcher = (
    <Controls
      base={base}
      selectedIso={requested ? toISODate(requested) : null}
      year={year}
      month={month}
    />
  );

  if (view === "year") {
    const shownYear = year ?? (mode === "gregorian" ? (requested ?? now).year : gregorianToHijri(requested ?? now).year);
    const { first, last } = yearBounds(mode, shownYear);
    const occasions = await getOccasionsBetween({ groupId: group, from: first, to: last });
    const occasionsByDay = byDay(occasions);
    const span =
      mode === "gregorian"
        ? `${gregorianToHijri(first).year} – ${gregorianToHijri(last).year} AH`
        : `${GREGORIAN_MONTHS[first.month - 1].slice(0, 3)} ${first.year} – ${GREGORIAN_MONTHS[last.month - 1].slice(0, 3)} ${last.year}`;

    return (
      <div>
        <PageHeader
          title={mode === "gregorian" ? String(shownYear) : `${shownYear} AH`}
          caption={span}
          mode={mode}
          prev={calendarHref({ ...base, y: shownYear - 1 })}
          next={calendarHref({ ...base, y: shownYear + 1 })}
          today={calendarHref({ ...base, d: todayIso })}
          controls={switcher}
        />
        <GroupFilter groups={groups} selected={group} hrefFor={(id) => calendarHref({ ...base, y: shownYear, group: id })} />

        <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3">
            {yearMonths(mode, shownYear).map((ref) => (
              <MiniMonth
                key={`${ref.year}-${ref.month}`}
                grid={monthGrid(ref)}
                occasions={occasionsByDay}
                todayIso={todayIso}
                titleHref={calendarHref({ ...base, view: "month", y: ref.year, m: urlMonth(ref) })}
                hrefFor={(iso) => calendarHref({ ...base, view: "month", d: iso })}
              />
            ))}
          </div>

          <section>
            <h2 className="eyebrow mb-2 border-b border-line pb-2 text-faint">
              {occasions.length} {occasions.length === 1 ? "occasion" : "occasions"} this year
            </h2>
            {occasions.length === 0 ? (
              <p className="text-sm text-faint">Nothing on the calendar this year.</p>
            ) : (
              <ul>
                {occasions.map((occasion) => (
                  <CompactOccasion
                    key={`${occasion.id}-${toISODate(occasion.occurrence.gregorian)}`}
                    occasion={occasion}
                    href={calendarHref({ ...base, view: "month", d: toISODate(occasion.occurrence.gregorian) })}
                    sameDay={(occasionsByDay.get(toISODate(occasion.occurrence.gregorian))?.length ?? 0) > 1}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    );
  }

  // Month view: an explicit y/m wins, then the month holding ?d=, then today's.
  const ref: MonthRef =
    year !== undefined && month !== undefined
      ? { mode, year, month: mode === "gregorian" ? month : month - 1 }
      : monthContaining(mode, requested ?? now);
  const grid = monthGrid(ref);

  const selected =
    requested && within(requested, grid.first, grid.last)
      ? requested
      : within(now, grid.first, grid.last)
        ? now
        : grid.first;
  const selectedIso = toISODate(selected);

  const occasions = await getOccasionsBetween({
    groupId: group,
    from: grid.cells[0].gregorian,
    to: grid.cells[grid.cells.length - 1].gregorian,
  });
  const occasionsByDay = byDay(occasions);
  const inMonth = occasions.filter((occasion) =>
    within(occasion.occurrence.gregorian, grid.first, grid.last),
  );

  const prev = shiftMonth(ref, -1);
  const next = shiftMonth(ref, 1);
  const here = { ...base, y: ref.year, m: urlMonth(ref) };

  return (
    <div>
      <PageHeader
        title={grid.title}
        caption={grid.span}
        arabic={mode === "hijri" ? HIJRI_MONTHS_ARABIC[ref.month] : undefined}
        mode={mode}
        prev={calendarHref({ ...base, y: prev.year, m: urlMonth(prev) })}
        next={calendarHref({ ...base, y: next.year, m: urlMonth(next) })}
        today={calendarHref({ ...base, d: todayIso })}
        controls={
          <Controls base={base} selectedIso={selectedIso} year={year} month={month} />
        }
      />
      <GroupFilter
        groups={groups}
        selected={group}
        hrefFor={(id) => calendarHref({ ...here, d: selectedIso, group: id })}
      />

      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0">
          <MonthGridView
            grid={grid}
            occasions={occasionsByDay}
            todayIso={todayIso}
            selectedIso={selectedIso}
            hrefFor={(iso) => calendarHref({ ...here, d: iso })}
          />
          <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
            <span>
              Large numbers are {mode === "gregorian" ? "Gregorian" : "Hijri"} days; small ones are the{" "}
              <span className={mode === "gregorian" ? "text-hijri" : "text-greg"}>
                {mode === "gregorian" ? "Hijri" : "Gregorian"}
              </span>{" "}
              date.
            </span>
            <span>
              Shaded days are in the next {mode === "gregorian" ? "Hijri" : "Gregorian"} month.
            </span>
          </p>
        </div>

        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <DayPanel
            date={selected}
            hijri={gregorianToHijri(selected)}
            today={now}
            occasions={occasionsByDay.get(selectedIso) ?? []}
            addHref={`/events/new?date=${selectedIso}${group ? `&group=${group}` : ""}`}
            returnTo={calendarHref({ ...here, d: selectedIso })}
          />

          <section>
            <h2 className="eyebrow mb-1 border-b border-line pb-2 text-faint">
              {inMonth.length === 0
                ? "Nothing else this month"
                : `${inMonth.length} ${inMonth.length === 1 ? "occasion" : "occasions"} this month`}
            </h2>
            <ul>
              {inMonth.map((occasion) => (
                <CompactOccasion
                  key={`${occasion.id}-${toISODate(occasion.occurrence.gregorian)}`}
                  occasion={occasion}
                  href={calendarHref({ ...here, d: toISODate(occasion.occurrence.gregorian) })}
                  sameDay={(occasionsByDay.get(toISODate(occasion.occurrence.gregorian))?.length ?? 0) > 1}
                />
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function urlMonth(ref: MonthRef): number {
  return ref.mode === "gregorian" ? ref.month : ref.month + 1;
}

function PageHeader({
  title,
  caption,
  arabic,
  mode,
  prev,
  next,
  today,
  controls,
}: {
  title: string;
  caption: string;
  arabic?: string;
  mode: CalendarMode;
  prev: string;
  next: string;
  today: string;
  controls: React.ReactNode;
}) {
  const stepper =
    "flex size-9 items-center justify-center text-muted transition-colors hover:bg-sunken hover:text-ink";

  return (
    <header className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] leading-none font-medium text-ink sm:text-[2.5rem]">
            {title}
          </h1>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-3 text-sm">
            <span className={mode === "gregorian" ? "text-hijri" : "text-greg"}>{caption}</span>
            {arabic && (
              <span lang="ar" dir="rtl" className="text-hijri">
                {arabic}
              </span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-line bg-surface">
          <Link href={prev} className={stepper} aria-label="Previous">
            <ChevronLeftIcon />
          </Link>
          <Link
            href={today}
            className="border-x border-line px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-sunken"
          >
            Today
          </Link>
          <Link href={next} className={stepper} aria-label="Next">
            <ChevronRightIcon />
          </Link>
        </div>
      </div>

      {controls}
    </header>
  );
}

/** Month/year and Gregorian/Hijri switches. Changing calendar keeps the day. */
function Controls({
  base,
  selectedIso,
  year,
  month,
}: {
  base: View;
  selectedIso: string | null;
  year?: number;
  month?: number;
}) {
  const keep = selectedIso ? { d: selectedIso } : {};
  const sameFrame = { y: year, m: month, ...keep };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented
        label="View"
        options={[
          { label: "Month", href: calendarHref({ ...base, view: "month", ...keep }), active: base.view === "month" },
          { label: "Year", href: calendarHref({ ...base, view: "year", ...keep }), active: base.view === "year" },
        ]}
      />
      <Segmented
        label="Calendar"
        options={[
          {
            label: "Gregorian",
            href: calendarHref({ ...base, mode: "gregorian", ...(base.mode === "gregorian" ? sameFrame : keep) }),
            active: base.mode === "gregorian",
            tone: "text-greg",
          },
          {
            label: "Hijri",
            href: calendarHref({ ...base, mode: "hijri", ...(base.mode === "hijri" ? sameFrame : keep) }),
            active: base.mode === "hijri",
            tone: "text-hijri",
          },
        ]}
      />
    </div>
  );
}

function Segmented({
  label,
  options,
}: {
  label: string;
  options: { label: string; href: string; active: boolean; tone?: string }[];
}) {
  return (
    <nav aria-label={label} className="inline-flex rounded-lg bg-sunken p-0.5">
      {options.map((option) => (
        <Link
          key={option.label}
          href={option.href}
          aria-current={option.active ? "page" : undefined}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            option.active
              ? `bg-surface font-medium shadow-sm ${option.tone ?? "text-ink"}`
              : "text-muted hover:text-ink"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}

function GroupFilter({
  groups,
  selected,
  hrefFor,
}: {
  groups: { id: string; name: string; type: keyof typeof GROUP_TYPE_EMOJI }[];
  selected: string | null;
  hrefFor: (id: string | null) => string;
}) {
  if (groups.length < 2) return null;

  const chip = (active: boolean) =>
    `flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
      active ? "border-ink bg-ink text-paper" : "border-line text-muted hover:border-line-strong hover:text-ink"
    }`;

  return (
    <nav aria-label="Filter by group" className="scroll-row -mx-4 mb-5 overflow-x-auto px-4">
      <div className="flex gap-1.5">
        <Link href={hrefFor(null)} className={chip(selected === null)} aria-current={selected === null ? "page" : undefined}>
          All groups
        </Link>
        {groups.map((candidate) => (
          <Link
            key={candidate.id}
            href={hrefFor(candidate.id)}
            aria-current={selected === candidate.id ? "page" : undefined}
            className={chip(selected === candidate.id)}
          >
            <span aria-hidden="true">{GROUP_TYPE_EMOJI[candidate.type]}</span>
            {candidate.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
