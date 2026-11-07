import Link from "next/link";
import { redirect } from "next/navigation";
import { primaryButton, secondaryButton } from "@/components/form-styles";
import { Mark } from "@/components/icons";
import { PersonalDateForm } from "@/components/personal-date-form";
import { DeleteDateButton, PersonalDateSummary } from "@/components/personal-dates";
import { getCurrentUser } from "@/lib/auth/session";
import { getPersonalDates } from "@/lib/occasions/personal-dates";
import { safeNext } from "@/lib/safe-next";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome — Mabrook" };

export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { next } = await searchParams;
  const dates = await getPersonalDates(user.id);
  const hasBirthday = dates.some((date) => date.type === "BIRTHDAY");

  return (
    <div className="mx-auto max-w-xl py-2 sm:py-6">
      <Mark className="size-10" />
      <h1 className="font-display mt-5 text-[2rem] leading-tight font-medium text-ink">
        {hasBirthday ? "Any other dates?" : "When's your birthday?"}
      </h1>
      <p className="mt-1.5 text-[0.95rem] text-muted">
        {hasBirthday
          ? "An anniversary, your nikah, a new home: add anything worth remembering."
          : "Add your date of birth, then anything else worth remembering."}{" "}
        These stay private to you. When you join a group, you choose which ones it can see.
      </p>

      {dates.length > 0 && (
        <ul className="mt-6 divide-y divide-line/70 border-y border-line">
          {dates.map((date) => (
            <li key={date.id} className="flex items-center justify-between gap-3 py-3">
              <PersonalDateSummary date={date} />
              <DeleteDateButton date={date} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 rounded-xl border border-line bg-surface p-4 sm:p-5">
        {/* Re-keyed so the form comes back empty after each save. */}
        <PersonalDateForm
          key={dates.length}
          hasBirthday={hasBirthday}
          submitLabel={dates.length > 0 ? "Add this date" : "Save this date"}
        />
      </div>

      <div className="mt-5 flex justify-end">
        <Link
          href={safeNext(next)}
          className={dates.length > 0 ? primaryButton : secondaryButton}
        >
          {dates.length > 0 ? "Continue" : "Skip for now"}
        </Link>
      </div>
    </div>
  );
}
