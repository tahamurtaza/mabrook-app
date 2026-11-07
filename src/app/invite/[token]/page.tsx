import Link from "next/link";
import { acceptInvite } from "@/app/actions/groups";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { primaryButton, secondaryButton } from "@/components/form-styles";
import { Mark } from "@/components/icons";
import { PersonalDateSummary } from "@/components/personal-dates";
import { GROUP_TYPE_EMOJI, GROUP_TYPE_LABELS } from "@/lib/occasions/labels";
import { getPersonalDates } from "@/lib/occasions/personal-dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Join a group — Mabrook" };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;

  const invite = await prisma.invite.findUnique({
    where: { id: token },
    include: {
      group: {
        include: { _count: { select: { members: true, events: true } } },
      },
    },
  });

  const expired =
    !invite || invite.revokedAt !== null || invite.expiresAt < new Date();

  if (expired) {
    return (
      <Shell title="This invite has expired">
        <p className="text-sm text-muted">
          The link has been revoked or has run out. Ask whoever sent it for a
          fresh one.
        </p>
        <Link
          href="/"
          className={`mt-5 inline-block ${secondaryButton}`}
        >
          Go to my calendar
        </Link>
      </Shell>
    );
  }

  const user = await getCurrentUser();
  const { group } = invite;

  const alreadyMember = user
    ? (await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: group.id, userId: user.id } },
        select: { groupId: true },
      })) !== null
    : false;

  // Only ever the viewer's own dates, for them to choose from.
  const dates = user && !alreadyMember ? await getPersonalDates(user.id) : [];

  return (
    <Shell title="You've been invited">
      <div className="border-y border-line py-4">
        <p className="font-display flex items-center gap-2.5 text-xl font-medium text-ink">
          <span aria-hidden="true">{GROUP_TYPE_EMOJI[group.type]}</span>
          {group.name}
        </p>
        <p className="mt-1 text-sm text-muted">
          {GROUP_TYPE_LABELS[group.type]} · {group._count.members}{" "}
          {group._count.members === 1 ? "member" : "members"} ·{" "}
          {group._count.events}{" "}
          {group._count.events === 1 ? "occasion" : "occasions"}
        </p>
      </div>

      {!user ? (
        <>
          <p className="mt-4 text-sm text-muted">
            Sign in or create an account to join. You&apos;ll come straight back
            here.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}`}
              className={primaryButton}
            >
              Create an account
            </Link>
            <Link
              href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
              className={secondaryButton}
            >
              Sign in
            </Link>
          </div>
        </>
      ) : alreadyMember ? (
        <>
          <p className="mt-4 text-sm text-muted">
            You&apos;re already in this group.
          </p>
          <Link
            href={`/groups/${group.id}`}
            className={`mt-4 inline-block ${primaryButton}`}
          >
            Open the group
          </Link>
        </>
      ) : (
        <form action={acceptInvite} className="mt-5">
          <input type="hidden" name="token" value={token} />

          {dates.length > 0 ? (
            <fieldset className="mb-5">
              <legend className="font-medium text-ink">
                Share your dates with {group.name}?
              </legend>
              <p className="mt-0.5 mb-2.5 text-sm text-muted">
                Tick the ones you&apos;d like them to see. The rest stay
                private, and you can change this later.
              </p>
              <ul className="space-y-1.5">
                {dates.map((date) => (
                  <li key={date.id}>
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-2.5 transition-colors hover:border-line-strong has-checked:border-ink has-checked:bg-surface">
                      <PersonalDateSummary date={date} />
                      <input
                        type="checkbox"
                        name="shareDateIds"
                        value={date.id}
                        className="size-4 shrink-0 accent-[var(--ink)]"
                      />
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          ) : (
            <p className="mb-4 text-sm text-muted">
              Once you&apos;ve joined, you can add your birthday and other dates in{" "}
              <Link href="/settings#dates" className="font-medium text-ink underline underline-offset-2">
                Settings
              </Link>{" "}
              and choose what to share.
            </p>
          )}

          <button
            type="submit"
            className={primaryButton}
          >
            Join {group.name}
          </button>
          <p className="mt-2 text-xs text-faint">
            You&apos;ll see this group&apos;s shared calendar, and its members
            will see you.
          </p>
        </form>
      )}
    </Shell>
  );
}

function Shell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md py-8 sm:py-14">
      <Mark className="size-10" />
      <h1 className="font-display mt-5 mb-4 text-[2rem] leading-tight font-medium text-ink">
        {title}
      </h1>
      {children}
    </div>
  );
}
