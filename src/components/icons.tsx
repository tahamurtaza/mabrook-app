/**
 * The handful of line icons the app uses, drawn on one 24px grid with one
 * stroke weight so they sit together. Inline rather than a package: there are
 * a dozen of them and they never change.
 */

type IconProps = { className?: string };

function Icon({
  className = "size-4",
  children,
  strokeWidth = 1.75,
}: IconProps & { children: React.ReactNode; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={2}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function AgendaIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" />
      <circle cx="4.5" cy="12" r="1" />
      <circle cx="4.5" cy="18" r="1" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Icon>
  );
}

export function PeopleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8.5" r="3.25" />
      <path d="M3.5 19.5c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M15.5 5.6a3.25 3.25 0 0 1 0 5.8M17.5 14.8c1.6.6 2.7 2.2 3 4.7" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </Icon>
  );
}

export function GroupsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9v10.5h12V9" />
      <path d="M10 19.5V15h4v4.5" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m14.5 6-6 6 6 6" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m9.5 6 6 6-6 6" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </Icon>
  );
}

export function SignOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14" />
      <path d="M10 8l-4 4 4 4M6 12h9.5" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5" />
    </Icon>
  );
}

/** The Hijri day turns over at Maghrib; this marks anything about sunset. */
export function SunsetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 16a5 5 0 0 1 10 0M3 16h18M5 20h14M12 4v4M5.6 9.6 7 11M18.4 9.6 17 11" />
    </Icon>
  );
}

/** Two calendar leaves overlapping: more than one occasion on a day. */
export function SameDayIcon(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={2}>
      <rect x="8.5" y="3.5" width="12" height="12" rx="2.5" />
      <path d="M15.5 19a2.5 2.5 0 0 1-2.5 1.5H6A2.5 2.5 0 0 1 3.5 18v-7A2.5 2.5 0 0 1 5 8.5" />
    </Icon>
  );
}

/** A notable day in the Hijri year. */
export function CrescentIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={props.className ?? "size-3"} aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.5 3.2a9 9 0 1 0 6.3 14.2A7.5 7.5 0 0 1 14.5 3.2Z"
      />
    </svg>
  );
}

/**
 * The mark: an amber sun and a teal crescent overlapping — the two calendars
 * the app holds together.
 */
export function Mark({ className = "size-6" }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="12.5" cy="16" r="8" fill="var(--greg)" />
      <path
        fill="var(--hijri)"
        d="M21.5 6.5a9.5 9.5 0 1 1-7.9 14.8 8 8 0 1 0 7.9-14.8Z"
      />
    </svg>
  );
}
