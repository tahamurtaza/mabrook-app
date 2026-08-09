import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  createInvite,
  leaveGroup,
  removeMember,
  revokeInvite,
} from "@/app/actions/groups";
import { InviteLink } from "@/components/invite-link";
import { OccasionRow } from "@/components/occasion-row";
import { getCurrentUser } from "@/lib/auth/session";
import { canAdminister, NotAMemberError, requireMembership } from "@/lib/groups/access";
import { prisma } from "@/lib/db";
import {
  GROUP_ROLE_LABELS,
  GROUP_TYPE_EMOJI,
  GROUP_TYPE_LABELS,
} from "@/lib/occasions/labels";
import { getGroupOccasions } from "@/lib/occasions/queries";

export const dynamic = "force-dynamic";

export default async function GroupPage({ params }: PageProps<"/groups/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  let role;
  try {
    role = await requireMembership(id);
  } catch (error) {
    if (error instanceof NotAMemberError) notFound();
    throw error;
  }

  const [group, occasions] = await Promise.all([
    prisma.group.findUniqueOrThrow({
      where: { id },
      include: {
        members: {
          orderBy: { joinedAt: "asc" },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        invites: {
          where: { revokedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    getGroupOccasions(id),
  ]);

  const isAdmin = canAdminister(role);

  return (
    <div>
      <header className="mb-7">
        <Link href="/groups" className="text-sm text-muted hover:text-ink">
          ← All groups
        </Link>
        <h1
          className="mt-2 flex items-center gap-2.5 text-2xl tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          <span aria-hidden="true">{GROUP_TYPE_EMOJI[group.type]}</span>
          {group.name}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {GROUP_TYPE_LABELS[group.type]} · {group.members.length}{" "}
          {group.members.length === 1 ? "member" : "members"} ·{" "}
          {occasions.length} {occasions.length === 1 ? "occasion" : "occasions"}
        </p>
      </header>

      {/* ---------------------------------------------------------------- */}
      <section className="mb-8">
        <h2 className="mb-3 border-b border-line pb-1.5 text-sm font-semibold text-ink">
          Members
        </h2>
        <ul className="space-y-2">
          {group.members.map((member) => (
            <li
              key={member.userId}
              className="flex items-center gap-3 rounded-lg border border-line bg-raised px-3.5 py-2.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">
                  {member.user.name}
                  {member.userId === user.id && (
                    <span className="ml-1.5 text-xs font-normal text-faint">you</span>
                  )}
                </span>
                <span className="block truncate text-xs text-muted">
                  {member.user.email}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-sunken px-2.5 py-1 text-xs text-muted">
                {GROUP_ROLE_LABELS[member.role]}
              </span>
              {isAdmin && member.userId !== user.id && member.role !== "OWNER" && (
                <form action={removeMember}>
                  <input type="hidden" name="groupId" value={group.id} />
                  <input type="hidden" name="userId" value={member.userId} />
                  <button
                    type="submit"
                    className="rounded-md px-2 py-1 text-xs text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                  >
                    Remove
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- */}
      {isAdmin && (
        <section className="mb-8">
          <h2 className="mb-3 border-b border-line pb-1.5 text-sm font-semibold text-ink">
            Invite links
          </h2>

          {group.invites.length > 0 ? (
            <ul className="mb-3 space-y-2.5">
              {group.invites.map((invite) => (
                <li key={invite.id} className="rounded-lg border border-line bg-raised p-3">
                  <InviteLink token={invite.id} />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-xs text-faint">
                      Expires{" "}
                      {invite.expiresAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <form action={revokeInvite}>
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <button
                        type="submit"
                        className="rounded-md px-2 py-1 text-xs text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        Revoke
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-sm text-muted">
              No active links. Create one and share it however you like — anyone
              who opens it can join this group.
            </p>
          )}

          <form action={createInvite}>
            <input type="hidden" name="groupId" value={group.id} />
            <button
              type="submit"
              className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Create an invite link
            </button>
          </form>
          <p className="mt-2 text-xs text-faint">
            Links work for anyone who has them and stop working after 7 days.
          </p>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      <section className="mb-8">
        <h2 className="mb-3 border-b border-line pb-1.5 text-sm font-semibold text-ink">
          Occasions
        </h2>
        {occasions.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing on this calendar yet.{" "}
            <Link
              href={`/events/new?group=${group.id}`}
              className="text-accent-text underline underline-offset-2"
            >
              Add the first occasion
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-2.5">
            {occasions.map((occasion) => (
              <OccasionRow key={occasion.id} occasion={occasion} showGroup={false} />
            ))}
          </ul>
        )}
      </section>

      <form action={leaveGroup} className="border-t border-line pt-5">
        <input type="hidden" name="groupId" value={group.id} />
        <button
          type="submit"
          className="text-sm text-faint transition-colors hover:text-danger"
        >
          Leave this group
        </button>
      </form>
    </div>
  );
}
