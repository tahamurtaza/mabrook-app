"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AgendaIcon,
  CalendarIcon,
  GroupsIcon,
  PeopleIcon,
  PlusIcon,
} from "./icons";

const SECTIONS = [
  { href: "/", label: "Upcoming", tour: "upcoming", Icon: AgendaIcon },
  { href: "/calendar", label: "Calendar", tour: "calendar", Icon: CalendarIcon },
  { href: "/people", label: "People", tour: "people", Icon: PeopleIcon },
  { href: "/groups", label: "Groups", tour: "groups", Icon: GroupsIcon },
] as const;

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/** Text tabs in the header, underlined in ink when current. */
export function DesktopNav() {
  const isActive = useActive();

  return (
    <nav aria-label="Sections" className="flex h-14 items-stretch gap-5">
      {SECTIONS.map(({ href, label, tour }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            data-tour={tour}
            aria-current={active ? "page" : undefined}
            className={`flex items-center border-b-2 text-sm transition-colors ${
              active
                ? "border-ink font-medium text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * A tab bar along the bottom of the screen on phones, where the thumb already
 * is. Adding an occasion sits in the middle, since it's the one action that
 * matters from every section.
 */
export function MobileNav() {
  const isActive = useActive();
  const [first, second, third, fourth] = SECTIONS;

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2">
        {[first, second].map((section) => (
          <Tab key={section.href} {...section} active={isActive(section.href)} />
        ))}
        <div className="flex justify-center">
          <Link
            href="/events/new"
            data-tour="add"
            aria-label="Add occasion"
            className="flex size-11 items-center justify-center rounded-full bg-action text-action-text shadow-float transition-transform active:scale-95"
          >
            <PlusIcon className="size-5" />
          </Link>
        </div>
        {[third, fourth].map((section) => (
          <Tab key={section.href} {...section} active={isActive(section.href)} />
        ))}
      </div>
    </nav>
  );
}

function Tab({
  href,
  label,
  tour,
  Icon,
  active,
}: (typeof SECTIONS)[number] & { active: boolean }) {
  return (
    <Link
      href={href}
      data-tour={tour}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-0.5 py-2.5 text-[0.68rem] font-medium transition-colors ${
        active ? "text-ink" : "text-faint"
      }`}
    >
      <Icon className="size-[1.35rem]" />
      {label}
    </Link>
  );
}
