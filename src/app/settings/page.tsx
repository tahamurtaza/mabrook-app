import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { setDateSharing } from "@/app/actions/personal-dates";
import { AccountFields } from "@/components/account-fields";
import { secondaryButton } from "@/components/form-styles";
import { ChevronDownIcon } from "@/components/icons";
import { EditableDate, PersonalDateForm } from "@/components/personal-date-form";
import { DeleteDateButton, PersonalDateSummary } from "@/components/personal-dates";
import { ThemeChoice } from "@/components/theme-choice";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getMyGroups, type MyGroup } from "@/lib/groups/access";
import { GROUP_TYPE_EMOJI } from "@/lib/occasions/labels";
import { getPersonalDates } from "@/lib/occasions/personal-dates";
import { getTheme } from "@/lib/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings — Mabrook" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [dates, groups, theme, account] = await Promise.all([
    getPersonalDates(user.id),
    getMyGroups(),
    getTheme(),
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { createdAt: true },
    }),
  ]);
  const hasBirthday = dates.some((date) => date.type === "BIRTHDAY");

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <h1 className="font-display text-[2rem] leading-tight font-medium text-ink sm:text-[2.25rem]">
        Settings
      </h1>

      <Section title="Account">
        <dl className="divide-y divide-line/70 border-y border-line text-sm">
          <AccountFields
            name={user.name}
            firstName={user.firstName}
            lastName={user.lastName}
            email={user.email}
          />
          <Row label="Member since">
            {account.createdAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Row>
          <Row label="Groups">
            {groups.length === 0 ? (
              "None yet"
            ) : (
              <Link href="/groups" className="underline-offset-2 hover:underline">
                {groups.map((group) => group.name).join(", ")}
              </Link>
            )}
          </Row>
        </dl>
        <form action={signOut} className="mt-4">
          <button type="submit" className={secondaryButton}>
            Sign out
          </button>
        </form>
      </Section>

      <Section title="Appearance" description="Saved on this device.">
        <ThemeChoice current={theme} />
      </Section>

      <Section
        id="dates"
        title="Your dates"
        description="Private to you. A group only sees the dates you switch on for it, and you can switch them off at any time."
      >
        {dates.length > 0 && (
          <ul className="divide-y divide-line border-y border-line">
            {dates.map((date) => (
              <li key={date.id} className="py-4">
                {/* Re-keyed on save, which closes the edit form. */}
                <EditableDate
                  key={date.updatedAt.getTime()}
                  date={date}
                  hasBirthday={hasBirthday}
                  summary={<PersonalDateSummary date={date} />}
                  actions={<DeleteDateButton date={date} />}
                />
                <Sharing
                  dateId={date.id}
                  groups={groups}
                  sharedWith={new Set(date.events.map((event) => event.groupId))}
                />
              </li>
            ))}
          </ul>
        )}

        {groups.length === 0 && dates.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            <Link href="/groups" className="font-medium text-ink underline underline-offset-2">
              Start or join a group
            </Link>{" "}
            to share these.
          </p>
        )}

        {/* Re-keyed on save, which closes it and clears the form. */}
        <details
          key={dates.length}
          open={dates.length === 0}
          className="mt-4 rounded-xl border border-line bg-surface"
        >
          <summary className="flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-ink sm:px-5">
            Add a date
            <ChevronDownIcon className="chevron size-4 text-faint transition-transform" />
          </summary>
          <div className="px-4 pb-5 sm:px-5">
            <PersonalDateForm hasBirthday={hasBirthday} />
          </div>
        </details>
      </Section>
    </div>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="font-display text-xl font-medium text-ink">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-x-4 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

/** One switch per group: is this date on that group's calendar? */
function Sharing({
  dateId,
  groups,
  sharedWith,
}: {
  dateId: string;
  groups: MyGroup[];
  sharedWith: Set<string>;
}) {
  if (groups.length === 0) return null;

  return (
    <div className="mt-3 sm:ml-7">
      <p className="eyebrow mb-1.5 text-faint">
        {sharedWith.size === 0 ? "Hidden from all your groups" : "Shown to"}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {groups.map((group) => {
          const shared = sharedWith.has(group.id);
          return (
            <li key={group.id}>
              <form action={setDateSharing}>
                <input type="hidden" name="dateId" value={dateId} />
                <input type="hidden" name="groupId" value={group.id} />
                <input type="hidden" name="share" value={shared ? "off" : "on"} />
                <button
                  type="submit"
                  aria-pressed={shared}
                  title={shared ? `Hide from ${group.name}` : `Show to ${group.name}`}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                    shared
                      ? "border-ink bg-ink text-paper"
                      : "border-line text-muted hover:border-line-strong hover:text-ink"
                  }`}
                >
                  <span aria-hidden="true">{GROUP_TYPE_EMOJI[group.type]}</span>
                  {group.name}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
