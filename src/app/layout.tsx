import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import Link from "next/link";
import { DesktopNav, MobileNav } from "@/components/site-nav";
import { Mark, PlusIcon, SettingsIcon, SignOutIcon } from "@/components/icons";
import { Tour, TourButton } from "@/components/tour";
import { getCurrentUser } from "@/lib/auth/session";
import { WEEKDAYS_SHORT } from "@/lib/calendar/grid";
import {
  dayOfWeek,
  GREGORIAN_MONTHS,
  gregorianToHijri,
  HIJRI_MONTHS_SHORT,
} from "@/lib/hijri/hijri";
import { getTheme } from "@/lib/theme";
import { today } from "@/lib/today";
import { signOut } from "./actions/auth";
import "./globals.css";

const sans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Mabrook — family occasions",
  description:
    "A shared calendar of birthdays, anniversaries and milestones, in both the Gregorian and Hijri calendars.",
};

const LIGHT_BAR = "#f7f4ee";
const DARK_BAR = "#14120f";

export async function generateViewport(): Promise<Viewport> {
  const theme = await getTheme();
  if (theme === "light") return { themeColor: LIGHT_BAR };
  if (theme === "dark") return { themeColor: DARK_BAR };
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: LIGHT_BAR },
      { media: "(prefers-color-scheme: dark)", color: DARK_BAR },
    ],
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [user, theme] = await Promise.all([getCurrentUser(), getTheme()]);

  return (
    <html
      lang="en"
      data-theme={theme === "auto" ? undefined : theme}
      className={`${sans.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:px-6 lg:gap-6">
            <Link href="/" className="flex items-center gap-2 text-ink">
              <Mark className="size-6" />
              <span className="font-display text-[1.35rem] leading-none font-medium">
                Mabrook
              </span>
            </Link>

            {user && (
              <>
                <div className="hidden md:block">
                  <DesktopNav />
                </div>

                <div className="ml-auto flex items-center gap-3">
                  <TodayStamp />
                  <Link
                    href="/events/new"
                    data-tour="add"
                    className="hidden items-center gap-1.5 rounded-lg bg-action px-3 py-1.5 text-sm font-medium whitespace-nowrap text-action-text transition-colors hover:bg-action-hover md:inline-flex"
                  >
                    <PlusIcon className="size-4" />
                    Add occasion
                  </Link>
                  <Link
                    href="/settings"
                    title="Settings"
                    className="flex size-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-sunken hover:text-ink"
                  >
                    <SettingsIcon className="size-[1.1rem]" />
                    <span className="sr-only">Settings</span>
                  </Link>
                  <form action={signOut}>
                    <button
                      type="submit"
                      title={`Sign out ${user.name}`}
                      className="flex size-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-sunken hover:text-ink"
                    >
                      <SignOutIcon className="size-[1.1rem]" />
                      <span className="sr-only">Sign out</span>
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </header>

        {user && !user.lastName && (
          <p className="border-b border-line bg-sunken px-4 py-2 text-center text-sm text-muted">
            Add your last name so people can tell you apart from anyone else called{" "}
            {user.firstName}.{" "}
            <Link href="/settings" className="font-medium text-ink underline underline-offset-2">
              Add it in Settings
            </Link>
          </p>
        )}

        <main
          className={`mx-auto w-full max-w-6xl flex-1 px-4 pt-6 sm:px-6 md:pt-8 ${
            user ? "pb-28 md:pb-12" : "pb-12"
          }`}
        >
          {children}
        </main>

        <footer
          className={`mx-auto w-full max-w-6xl px-4 text-xs text-faint sm:px-6 ${
            user ? "pb-28 md:pb-8" : "pb-8"
          }`}
        >
          <p className="border-t border-line pt-4">
            Hijri dates follow the Dawoodi Bohra (Misri) calendar. The Hijri day
            begins at Maghrib the evening before.
            {user && (
              <>
                {" "}
                <TourButton />
              </>
            )}
          </p>
        </footer>

        {user && <MobileNav />}
        {/* Keyed so a different account on the same tab starts fresh. */}
        {user && <Tour key={user.id} pending={user.tourPending} />}
      </body>
    </html>
  );
}

/** Today in both calendars — the one fact every page is read against. */
function TodayStamp() {
  const now = today();
  const hijri = gregorianToHijri(now);

  return (
    <p
      data-tour="today"
      className="tnum flex flex-col items-end text-right text-[0.7rem] leading-tight whitespace-nowrap sm:flex-row sm:items-baseline sm:gap-2 sm:text-xs"
    >
      <span className="hidden text-faint lg:inline">Today</span>
      <span className="font-medium text-greg">
        {WEEKDAYS_SHORT[dayOfWeek(now)]} {now.day} {GREGORIAN_MONTHS[now.month - 1].slice(0, 3)}
        <span className="hidden lg:inline"> {now.year}</span>
      </span>
      <span className="font-medium text-hijri">
        {hijri.day} {HIJRI_MONTHS_SHORT[hijri.month]}
        <span className="hidden lg:inline"> {hijri.year}</span>
      </span>
    </p>
  );
}
