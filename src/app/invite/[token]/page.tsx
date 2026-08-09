import Link from "next/link";
import { acceptInvite } from "@/app/actions/groups";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { GROUP_TYPE_EMOJI, GROUP_TYPE_LABELS } from "@/lib/occasions/labels";

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
          className="mt-5 inline-block rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-sunken"
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

  return (
    <Shell title="You've been invited">
      <div className="rounded-xl border border-line bg-raised p-4">
        <p className="flex items-center gap-2.5 text-lg font-medium text-ink">
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
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Create an account
            </Link>
            <Link
              href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-sunken"
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
            className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Open the group
          </Link>
        </>
      ) : (
        <form action={acceptInvite} className="mt-4">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
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
    <div className="mx-auto max-w-md py-6">
      <h1
        className="mb-4 text-2xl tracking-tight text-ink"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        {title}
      </h1>
      {children}
    </div>
  );
}
