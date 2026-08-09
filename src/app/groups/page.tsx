import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateGroupForm } from "@/components/create-group-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyGroups } from "@/lib/groups/access";
import {
  GROUP_ROLE_LABELS,
  GROUP_TYPE_EMOJI,
  GROUP_TYPE_LABELS,
} from "@/lib/occasions/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Groups — Mabrook" };

export default async function GroupsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const groups = await getMyGroups();

  return (
    <div>
      <header className="mb-7">
        <h1
          className="text-2xl tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Groups
        </h1>
        <p className="mt-1 text-sm text-muted">
          Each group keeps its own calendar and its own list of people. You only
          ever see the groups you&apos;ve been invited to.
        </p>
      </header>

      {groups.length > 0 && (
        <ul className="mb-8 space-y-2.5">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="flex items-center gap-3.5 rounded-xl border border-line bg-raised p-4 transition-colors hover:border-line-strong"
              >
                <span className="text-xl" aria-hidden="true">
                  {GROUP_TYPE_EMOJI[group.type]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">
                    {group.name}
                  </span>
                  <span className="block text-sm text-muted">
                    {GROUP_TYPE_LABELS[group.type]} ·{" "}
                    {group.memberCount === 1
                      ? "1 member"
                      : `${group.memberCount} members`}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-sunken px-2.5 py-1 text-xs text-muted">
                  {GROUP_ROLE_LABELS[group.role]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="rounded-xl border border-line bg-raised p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink">
          {groups.length === 0 ? "Start your first group" : "Start another group"}
        </h2>
        <CreateGroupForm />
      </section>

      <p className="mt-5 text-center text-xs text-faint">
        Been sent an invite link? Open it and you&apos;ll join once signed in.
      </p>
    </div>
  );
}
