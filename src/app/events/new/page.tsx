import Link from "next/link";
import { redirect } from "next/navigation";
import { EventForm } from "@/components/event-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyGroupIds } from "@/lib/groups/access";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add an occasion — Mabrook" };

export default async function NewEventPage({
  searchParams,
}: PageProps<"/events/new">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const groupIds = await getMyGroupIds();

  if (groupIds.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-dashed border-line-strong bg-raised px-6 py-12 text-center">
        <h1 className="font-medium text-ink">You need a group first</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
          Occasions belong to a group, so there&apos;s somewhere to share them.
        </p>
        <Link
          href="/groups"
          className="mt-5 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Create a group
        </Link>
      </div>
    );
  }

  const groups = await prisma.group.findMany({
    where: { id: { in: groupIds } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      people: { orderBy: { name: "asc" }, select: { id: true, name: true } },
    },
  });

  // A ?group= hint from the group page, honoured only if it's really theirs.
  const { group } = await searchParams;
  const preselected =
    typeof group === "string" && groupIds.includes(group) ? group : groups[0].id;

  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-7">
        <h1
          className="text-2xl tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Add an occasion
        </h1>
        <p className="mt-1 text-sm text-muted">
          Enter the date in whichever calendar you know it in — the other is
          worked out and stored alongside it.
        </p>
      </header>

      <EventForm groups={groups} defaultGroupId={preselected} />
    </div>
  );
}
