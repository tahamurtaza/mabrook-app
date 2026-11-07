"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SearchIcon } from "./icons";

export interface DirectoryOccasion {
  id: string;
  title: string;
  emoji: string;
  originGregorian: string;
  originHijri: string;
  observed: "GREGORIAN" | "HIJRI" | "BOTH";
  next: {
    gregorian: string;
    hijri: string;
    iso: string;
    daysAway: number;
    years: string | null;
    anchor: "GREGORIAN" | "HIJRI" | "BOTH";
  } | null;
}

export interface DirectoryPerson {
  id: string;
  name: string;
  occasions: DirectoryOccasion[];
  /** Days to their soonest occasion, for sorting. */
  soonest: number | null;
}

export interface DirectoryGroup {
  id: string;
  name: string;
  emoji: string;
  people: DirectoryPerson[];
}

/** Up to two initials, as a stand-in for a photo. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function when(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/**
 * Everyone, by group, with their occasions inline: the original date in both
 * calendars and when each next comes round. Filter by typing a name or an
 * occasion; sort alphabetically or by who's next.
 */
export function PeopleDirectory({ groups }: { groups: DirectoryGroup[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"name" | "soonest">("name");

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return groups.map((group) => {
      const people = group.people.filter(
        (person) =>
          !needle ||
          person.name.toLowerCase().includes(needle) ||
          person.occasions.some((occasion) => occasion.title.toLowerCase().includes(needle)),
      );
      if (sort === "soonest") {
        people.sort(
          (a, b) =>
            (a.soonest ?? Number.MAX_SAFE_INTEGER) - (b.soonest ?? Number.MAX_SAFE_INTEGER) ||
            a.name.localeCompare(b.name),
        );
      }
      return { ...group, people };
    });
  }, [groups, query, sort]);

  const total = shown.reduce((sum, group) => sum + group.people.length, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="relative min-w-0 flex-1 sm:max-w-sm">
          <span className="sr-only">Find a person or occasion</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a person or occasion"
            className="w-full rounded-lg border border-line bg-surface py-2 pr-3 pl-9 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-ink"
          />
        </label>
        <div className="inline-flex rounded-lg bg-sunken p-0.5" role="group" aria-label="Sort">
          {(
            [
              ["name", "A–Z"],
              ["soonest", "Next up"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={sort === value}
              onClick={() => setSort(value)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                sort === value ? "bg-surface font-medium text-ink shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {total === 0 && (
        <p className="py-10 text-center text-sm text-faint">No one matches “{query}”.</p>
      )}

      <div className="space-y-10">
        {shown.map(
          (group) =>
            (group.people.length > 0 || !query) && (
              <section key={group.id}>
                <h2 className="flex items-baseline gap-2.5 border-b border-line pb-2">
                  <Link
                    href={`/groups/${group.id}`}
                    className="font-display text-lg font-medium text-ink hover:underline"
                  >
                    <span aria-hidden="true" className="mr-1.5">
                      {group.emoji}
                    </span>
                    {group.name}
                  </Link>
                  <span className="tnum ml-auto text-xs text-faint">
                    {group.people.length} {group.people.length === 1 ? "person" : "people"}
                  </span>
                </h2>

                {group.people.length === 0 ? (
                  <p className="py-6 text-sm text-faint">No one on this list yet.</p>
                ) : (
                  <ul className="divide-y divide-line/70">
                    {group.people.map((person) => (
                      <PersonRow key={person.id} person={person} />
                    ))}
                  </ul>
                )}
              </section>
            ),
        )}
      </div>
    </div>
  );
}

function PersonRow({ person }: { person: DirectoryPerson }) {
  return (
    <li className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3.5 py-4 md:grid-cols-[2.5rem_11rem_minmax(0,1fr)]">
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-full bg-sunken text-sm font-semibold text-ink-soft"
      >
        {initials(person.name)}
      </span>

      <div className="min-w-0 self-start pt-0.5">
        <h3 className="truncate font-medium text-ink">{person.name}</h3>
        <p className="text-xs text-faint">
          {person.occasions.length === 0
            ? "Nothing recorded yet"
            : `${person.occasions.length} ${person.occasions.length === 1 ? "occasion" : "occasions"}`}
        </p>
      </div>

      {person.occasions.length > 0 && (
        <ul className="col-start-2 mt-2 space-y-2 md:col-start-3 md:mt-0">
          {person.occasions.map((occasion) => (
            <li
              key={occasion.id}
              className="tnum grid gap-x-4 gap-y-0.5 text-sm sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <p className="truncate text-ink">
                  <span aria-hidden="true" className="mr-1.5">
                    {occasion.emoji}
                  </span>
                  {occasion.title}
                </p>
                <p className="flex flex-wrap gap-x-2.5 text-xs">
                  <span className={occasion.observed === "HIJRI" ? "text-faint" : "text-greg"}>
                    {occasion.originGregorian}
                  </span>
                  <span className={occasion.observed === "GREGORIAN" ? "text-faint" : "text-hijri"}>
                    {occasion.originHijri}
                  </span>
                </p>
              </div>
              {occasion.next ? (
                <Link
                  href={`/calendar?d=${occasion.next.iso}`}
                  className="text-xs text-muted transition-colors hover:text-ink sm:text-right"
                >
                  <span className="text-ink-soft">
                    {occasion.next.anchor === "HIJRI" ? occasion.next.hijri : occasion.next.gregorian}
                  </span>{" "}
                  · {when(occasion.next.daysAway)}
                  {occasion.next.years && (
                    <span className="block text-faint">{occasion.next.years}</span>
                  )}
                </Link>
              ) : (
                <span className="text-xs text-faint sm:text-right">One-off</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
