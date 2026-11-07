import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { claimPerson } from "@/app/actions/people";
import { primaryButton, secondaryButton } from "@/components/form-styles";
import { ChevronDownIcon, Mark } from "@/components/icons";
import { DualDate } from "@/components/occasions";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { NotAMemberError, requireMembership } from "@/lib/groups/access";
import { EVENT_TYPE_EMOJI } from "@/lib/occasions/labels";
import {
  canClaim,
  findMyEntries,
  getUnclaimedEntries,
  type UnclaimedEntry,
} from "@/lib/people/roster";

export const dynamic = "force-dynamic";
export const metadata = { title: "Is this you? — Mabrook" };

export default async function ClaimPage({ params }: PageProps<"/groups/[id]/claim">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  try {
    await requireMembership(id);
  } catch (error) {
    if (error instanceof NotAMemberError) notFound();
    throw error;
  }

  const groupHref = `/groups/${id}`;
  if (!(await canClaim(user.id, id))) redirect(groupHref);

  const [group, matches, everyone] = await Promise.all([
    prisma.group.findUniqueOrThrow({ where: { id }, select: { name: true } }),
    findMyEntries(user, id),
    getUnclaimedEntries(id),
  ]);

  const suggested = new Set(matches.map((match) => match.entry.id));
  const others = everyone.filter((entry) => !suggested.has(entry.id));

  return (
    <div className="mx-auto max-w-xl py-2 sm:py-6">
      <Mark className="size-10" />
      <h1 className="font-display mt-5 text-[2rem] leading-tight font-medium text-ink">
        {matches.length > 0 ? "Is one of these you?" : "Are you on this list?"}
      </h1>
      <p className="mt-1.5 text-[0.95rem] text-muted">
        Someone in {group.name} may have added you before you joined. If so, say so and those
        occasions become yours, with no duplicate. You can undo this from the group&apos;s page.
      </p>

      {matches.length > 0 && (
        <ul className="mt-6 space-y-2">
          {matches.map(({ entry, reason }) => (
            <Candidate
              key={entry.id}
              entry={entry}
              groupId={id}
              note={reason === "date" ? "Shares a date with you" : "Similar name"}
              primary
            />
          ))}
        </ul>
      )}

      {others.length > 0 &&
        (matches.length > 0 ? (
          <details className="mt-4 rounded-xl border border-line">
            <summary className="flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-ink">
              Not here? See everyone on the list
              <ChevronDownIcon className="chevron size-4 text-faint transition-transform" />
            </summary>
            <ul className="space-y-2 px-3 pb-3">
              {others.map((entry) => (
                <Candidate key={entry.id} entry={entry} groupId={id} />
              ))}
            </ul>
          </details>
        ) : (
          <ul className="mt-6 space-y-2">
            {others.map((entry) => (
              <Candidate key={entry.id} entry={entry} groupId={id} />
            ))}
          </ul>
        ))}

      <div className="mt-5 flex justify-end">
        <Link href={groupHref} className={secondaryButton}>
          {matches.length > 0 ? "Not me" : "I'm not on it"}
        </Link>
      </div>
    </div>
  );
}

function Candidate({
  entry,
  groupId,
  note,
  primary = false,
}: {
  entry: UnclaimedEntry;
  groupId: string;
  note?: string;
  primary?: boolean;
}) {
  return (
    <li className="rounded-xl border border-line bg-surface px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg leading-snug font-medium text-ink">{entry.name}</p>
          {note && <p className="text-xs text-faint">{note}</p>}
        </div>
        <form action={claimPerson} className="shrink-0">
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="personId" value={entry.id} />
          <button
            type="submit"
            className={primary ? primaryButton : `${secondaryButton} !px-3 !py-1.5`}
          >
            That&apos;s me
          </button>
        </form>
      </div>

      {entry.occasions.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {entry.occasions.map((occasion) => (
            <li key={occasion.id} className="text-sm text-ink-soft">
              <span aria-hidden="true" className="mr-1.5">
                {EVENT_TYPE_EMOJI[occasion.type]}
              </span>
              {occasion.title}
              <span className="mt-0.5 block text-xs">
                <DualDate
                  gregorian={{
                    year: occasion.gregorianYear,
                    month: occasion.gregorianMonth,
                    day: occasion.gregorianDay,
                  }}
                  hijri={{
                    year: occasion.hijriYear,
                    month: occasion.hijriMonth,
                    day: occasion.hijriDay,
                  }}
                  anchor={occasion.observedCalendar}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
