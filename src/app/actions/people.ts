"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { canAdminister, requireGroupAdmin, requireMembership } from "@/lib/groups/access";
import { claimEntry, mergeEntries, unclaimEntry } from "@/lib/people/roster";

export interface MergeFormState {
  error?: string;
}

/** "That's me." Takes effect at once; it can be undone from the group page. */
export async function claimPerson(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const groupId = String(formData.get("groupId") ?? "");
  await requireMembership(groupId);
  await claimEntry({ user, groupId, personId: String(formData.get("personId") ?? "") });

  revalidatePath("/", "layout");
  redirect(`/groups/${groupId}`);
}

/** Undo a link. For the person concerned, or a group's owners and admins. */
export async function unclaimPerson(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const groupId = String(formData.get("groupId") ?? "");
  const personId = String(formData.get("personId") ?? "");

  const role = await requireMembership(groupId);
  if (!canAdminister(role)) {
    const entry = await prisma.person.findFirst({
      where: { id: personId, groupId, userId: user.id },
      select: { id: true },
    });
    if (!entry) return;
  }

  await unclaimEntry({ groupId, personId });
  revalidatePath("/", "layout");
}

export async function mergePeople(
  _previous: MergeFormState,
  formData: FormData,
): Promise<MergeFormState> {
  const groupId = String(formData.get("groupId") ?? "");
  await requireGroupAdmin(groupId);

  const error = await mergeEntries({
    groupId,
    firstId: String(formData.get("firstId") ?? ""),
    secondId: String(formData.get("secondId") ?? ""),
  });
  if (error) return { error };

  revalidatePath("/", "layout");
  return {};
}
