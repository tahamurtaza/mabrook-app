import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  createInvite,
  leaveGroup,
  removeMember,
  revokeInvite,
} from "@/app/actions/groups";
import { unclaimPerson } from "@/app/actions/people";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { CalendarIcon, ChevronLeftIcon, PlusIcon } from "@/components/icons";
import { InviteLink } from "@/components/invite-link";
import { MergePeople } from "@/components/merge-people";
import { Agenda, DayRows } from "@/components/occasions";
import { RoleSelect } from "@/components/role-select";
import { getCurrentUser } from "@/lib/auth/session";
import { getBaseUrl } from "@/lib/base-url";
import { canAdminister, NotAMemberError, requireMembership } from "@/lib/groups/access";
import { prisma } from "@/lib/db";
import {
  GROUP_ROLE_LABELS,
  GROUP_TYPE_EMOJI,
  GROUP_TYPE_LABELS,
} from "@/lib/occasions/labels";
import { getGroupOccasions } from "@/lib/occasions/queries";
import { canClaim } from "@/lib/people/roster";
import { today } from "@/lib/today";

export const dynamic = "force-dynamic";

/** Two initials, the way a contact avatar falls back without a photo. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

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

  const [group, occasions, baseUrl, roster, mayClaim] = await Promise.all([
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
        _count: { select: { people: true } },
      },
    }),
    getGroupOccasions(id),
    getBaseUrl(),
    prisma.person.findMany({
      where: { groupId: id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        userId: true,
        claimedName: true,
        _count: { select: { events: true } },
      },
    }),
    canClaim(user.id, id),
  ]);

  const now = today();
  const isAdmin = canAdminister(role);
  const isOwner = role === "OWNER";

  // Who's been linked to an entry, for those allowed to undo it.
  const links = roster.filter(
    (person) => person.claimedName && (isAdmin || person.userId === user.id),
  );
  const ownerCount = group.members.filter((member) => member.role === "OWNER").length;
  const soleOwner = isOwner && ownerCount <= 1;

  // Recurring occasions always have a next turn; a one-off that has happened
  // stays on the record, but below what's still to come.
  const upcoming = occasions.filter((occasion) => occasion.occurrence.daysAway >= 0);
  const past = occasions
    .filter((occasion) => occasion.occurrence.daysAway < 0)
    .sort((a, b) => b.occurrence.daysAway - a.occurrence.daysAway);
  const returnTo = `/groups/${group.id}`;

  return (
    <div>
      <header className="mb-8">
        <Link
          href="/groups"
          className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink"
        >
          <ChevronLeftIcon className="size-4" />
          All groups
        </Link>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display flex items-center gap-3 text-[2rem] leading-tight font-medium text-ink sm:text-[2.25rem]">
              <span aria-hidden="true" className="text-[1.75rem]">
                {GROUP_TYPE_EMOJI[group.type]}
              </span>
              {group.name}
            </h1>
            <p className="tnum mt-1 text-sm text-muted">
              {GROUP_TYPE_LABELS[group.type]} · {group.members.length}{" "}
              {group.members.length === 1 ? "member" : "members"} · {group._count.people}{" "}
              {group._count.people === 1 ? "person" : "people"} · {occasions.length}{" "}
              {occasions.length === 1 ? "occasion" : "occasions"}
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/calendar?group=${group.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-sunken"
            >
              <CalendarIcon className="size-4" />
              Calendar
            </Link>
            <Link
              href={`/events/new?group=${group.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-action px-3 py-2 text-sm font-medium text-action-text transition-colors hover:bg-action-hover"
            >
              <PlusIcon className="size-4" />
              Add occasion
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* ---------------------------------------------------------------- */}
        <div className="min-w-0">
          {occasions.length === 0 ? (
            <p className="border-y border-line py-10 text-center text-sm text-muted">
              Nothing on this calendar yet.{" "}
              <Link
                href={`/events/new?group=${group.id}`}
                className="font-medium text-ink underline underline-offset-2"
              >
                Add the first occasion
              </Link>
              .
            </p>
          ) : (
            <>
              {upcoming.length > 0 && (
                <Agenda occasions={upcoming} today={now} showGroup={false} returnTo={returnTo} />
              )}

              {past.length > 0 && (
                <section className="mt-10">
                  <h2 className="flex items-baseline gap-2.5 border-b border-line py-2.5">
                    <span className="font-display text-lg font-medium text-ink">On the record</span>
                    <span className="text-xs text-faint">One-off occasions that have passed</span>
                  </h2>
                  <DayRows occasions={past} today={now} returnTo={returnTo} dateLabel="month" />
                </section>
              )}
            </>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        <aside className="space-y-9">
          <section>
            <h2 className="eyebrow mb-1 border-b border-line pb-2 text-faint">
              Members · {group.members.length}
            </h2>
            <ul className="divide-y divide-line/70">
              {group.members.map((member) => {
                const isMe = member.userId === user.id;
                return (
                  <li key={member.userId} className="flex items-center gap-3 py-2.5">
                    <span
                      aria-hidden="true"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sunken text-xs font-semibold text-ink-soft"
                    >
                      {initials(member.user.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {member.user.name}
                        {isMe && <span className="ml-1.5 text-xs font-normal text-faint">you</span>}
                      </span>
                      <span className="block truncate text-xs text-muted">{member.user.email}</span>
                    </span>

                    {isOwner && !isMe ? (
                      <RoleSelect groupId={group.id} userId={member.userId} role={member.role} />
                    ) : (
                      <span className="shrink-0 text-xs text-faint">
                        {GROUP_ROLE_LABELS[member.role]}
                      </span>
                    )}

                    {isAdmin && !isMe && member.role !== "OWNER" && (
                      <form action={removeMember}>
                        <input type="hidden" name="groupId" value={group.id} />
                        <input type="hidden" name="userId" value={member.userId} />
                        <ConfirmSubmit
                          message={`Remove ${member.user.name} from ${group.name}?`}
                          className="rounded-md px-1.5 py-1 text-xs text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                        >
                          Remove
                        </ConfirmSubmit>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <p className="-mt-6 text-xs text-faint">
            <Link href="/settings#dates" className="underline underline-offset-2 hover:text-ink">
              Choose which of your dates this group sees
            </Link>
            {mayClaim && (
              <>
                {" · "}
                <Link
                  href={`/groups/${group.id}/claim`}
                  className="underline underline-offset-2 hover:text-ink"
                >
                  Already on the list?
                </Link>
              </>
            )}
          </p>

          {(links.length > 0 || (isAdmin && roster.length > 1)) && (
            <section>
              <h2 className="eyebrow mb-3 border-b border-line pb-2 text-faint">
                {isAdmin ? "Tidy up the list" : "Your link"}
              </h2>

              {links.length > 0 && (
                <ul className="mb-3 space-y-1.5 text-sm">
                  {links.map((person) => (
                    <li key={person.id} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 text-muted">
                        <span className="text-ink">{person.name}</span> was added as{" "}
                        <span className="text-ink">{person.claimedName}</span>
                      </span>
                      <form action={unclaimPerson} className="shrink-0">
                        <input type="hidden" name="groupId" value={group.id} />
                        <input type="hidden" name="personId" value={person.id} />
                        <ConfirmSubmit
                          message={`Undo this? ${person.claimedName} goes back to being a separate entry.`}
                          className="rounded-md px-1.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-sunken"
                        >
                          Undo
                        </ConfirmSubmit>
                      </form>
                    </li>
                  ))}
                </ul>
              )}

              {isAdmin && roster.length > 1 && (
                <>
                  <p className="mb-2 text-sm text-muted">
                    Is someone on the list twice? Merge them into one.
                  </p>
                  <MergePeople
                    groupId={group.id}
                    people={roster.map((person) => ({
                      id: person.id,
                      label: `${person.name}${person.userId ? " (has an account)" : ""} · ${person._count.events} ${person._count.events === 1 ? "occasion" : "occasions"}`,
                    }))}
                  />
                </>
              )}
            </section>
          )}

          {isAdmin && (
            <section>
              <h2 className="eyebrow mb-3 border-b border-line pb-2 text-faint">Invite links</h2>

              {group.invites.length > 0 ? (
                <ul className="mb-3 space-y-3">
                  {group.invites.map((invite) => (
                    <li key={invite.id}>
                      <InviteLink url={`${baseUrl}/invite/${invite.id}`} />
                      <div className="mt-1.5 flex items-center justify-between gap-3">
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
                            className="rounded-md px-1.5 py-1 text-xs text-faint transition-colors hover:bg-danger-soft hover:text-danger"
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
                  No active links. Create one and share it however you like — anyone who opens
                  it can join this group.
                </p>
              )}

              <form action={createInvite}>
                <input type="hidden" name="groupId" value={group.id} />
                <button
                  type="submit"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-sunken"
                >
                  Create an invite link
                </button>
              </form>
              <p className="mt-2 text-xs text-faint">
                Links work for anyone who has them and stop working after 7 days.
              </p>
            </section>
          )}

          <section className="border-t border-line pt-4">
            {soleOwner ? (
              <p className="text-xs text-faint">
                You&apos;re the only owner. Make someone else an owner before you can leave.
              </p>
            ) : (
              <form action={leaveGroup}>
                <input type="hidden" name="groupId" value={group.id} />
                <ConfirmSubmit
                  message={`Leave ${group.name}? You'll stop seeing its calendar.`}
                  className="text-sm text-faint transition-colors hover:text-danger"
                >
                  Leave this group
                </ConfirmSubmit>
              </form>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
