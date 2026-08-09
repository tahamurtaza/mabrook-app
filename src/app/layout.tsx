import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { signOut } from "./actions/auth";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

export const metadata: Metadata = {
  title: "Mabrook — family occasions",
  description:
    "A shared family calendar of birthdays, anniversaries and milestones, in both the Gregorian and Hijri calendars.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body
        className="flex min-h-full flex-col"
        style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
      >
        <header className="border-b border-line bg-raised">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-5 py-3.5">
            <Link
              href="/"
              className="text-lg tracking-tight text-accent-text"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Mabrook
            </Link>

            {user ? (
              <nav className="flex flex-1 items-center justify-end gap-1 text-sm">
                <Link
                  href="/"
                  className="rounded-md px-2.5 py-1.5 text-muted transition-colors hover:bg-sunken hover:text-ink"
                >
                  Upcoming
                </Link>
                <Link
                  href="/groups"
                  className="rounded-md px-2.5 py-1.5 text-muted transition-colors hover:bg-sunken hover:text-ink"
                >
                  Groups
                </Link>
                <Link
                  href="/people"
                  className="rounded-md px-2.5 py-1.5 text-muted transition-colors hover:bg-sunken hover:text-ink"
                >
                  People
                </Link>
                <Link
                  href="/events/new"
                  className="ml-1 rounded-md bg-accent px-3 py-1.5 font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  Add occasion
                </Link>
                <form action={signOut} className="ml-1">
                  <button
                    type="submit"
                    className="rounded-md px-2.5 py-1.5 text-faint transition-colors hover:bg-sunken hover:text-ink"
                  >
                    Sign out
                  </button>
                </form>
              </nav>
            ) : (
              <nav className="flex flex-1 items-center justify-end gap-1 text-sm">
                <Link
                  href="/login"
                  className="rounded-md px-2.5 py-1.5 text-muted transition-colors hover:bg-sunken hover:text-ink"
                >
                  Sign in
                </Link>
              </nav>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">
          {children}
        </main>

        <footer className="border-t border-line px-5 py-5 text-center text-xs text-faint">
          Hijri dates follow the Dawoodi Bohra (Misri) calendar.
        </footer>
      </body>
    </html>
  );
}
