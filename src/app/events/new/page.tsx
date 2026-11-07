import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { EventForm } from "@/components/event-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyGroupIds } from "@/lib/groups/access";
import { prisma } from "@/lib/db";
import { today } from "@/lib/today";

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
      <EmptyState
        emoji="👥"
        title="You need a group first"
        body="Occasions belong to a group, so there's somewhere to share them."
        action={{ href: "/groups", label: "Create a group" }}
      />
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
  const { group, date } = await searchParams;
  const preselected =
    typeof group === "string" && groupIds.includes(group) ? group : groups[0].id;
  // A ?date= from a day on the calendar, used only if it's a well-formed date.
  const defaultDate =
    typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-[2rem] leading-tight font-medium text-ink sm:text-[2.25rem]">
          Add an occasion
        </h1>
        <p className="mt-1.5 max-w-xl text-[0.95rem] text-muted">
          Enter the date in whichever calendar you know it in — the other is worked out and
          stored alongside it.
        </p>
      </header>

      <EventForm
        groups={groups}
        defaultGroupId={preselected}
        defaultDate={defaultDate}
        today={today()}
      />
    </div>
  );
}
