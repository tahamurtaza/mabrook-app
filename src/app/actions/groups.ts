"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  getMyGroups,
  NotAMemberError,
  requireGroupAdmin,
  requireMembership,
} from "@/lib/groups/access";

export interface GroupFormState {
  error?: string;
}

const GROUP_TYPES = [
  "FAMILY",
  "FRIENDS",
  "SCHOOL",
  "WORK",
  "NEIGHBOURS",
  "OTHER",
] as const;

const INVITE_DAYS = 7;

const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Give the group a name.").max(80),
  type: z.enum(GROUP_TYPES),
});

export async function createGroup(
  _previous: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = createGroupSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      members: { create: { userId: user.id, role: "OWNER" } },
      // The creator starts on their own group's roster, so occasions can be
      // about them straight away.
      people: { create: { name: user.name, userId: user.id } },
    },
  });

  revalidatePath("/");
  redirect(`/groups/${group.id}`);
}

/**
 * Mint a shareable join link.
 *
 * The token is 32 bytes from a CSPRNG — it is the only thing standing between
 * a stranger and the group's calendar, so it must not be guessable.
 */
export async function createInvite(formData: FormData): Promise<void> {
  const groupId = String(formData.get("groupId") ?? "");
  await requireGroupAdmin(groupId);

  await prisma.invite.create({
    data: {
      id: randomBytes(32).toString("base64url"),
      groupId,
      expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
      createdById: (await getCurrentUser())?.id,
    },
  });

  revalidatePath(`/groups/${groupId}`);
}

export async function revokeInvite(formData: FormData): Promise<void> {
  const inviteId = String(formData.get("inviteId") ?? "");

  const invite = await prisma.invite.findUnique({
    where: { id: inviteId },
    select: { groupId: true },
  });
  if (!invite) return;

  await requireGroupAdmin(invite.groupId);
  await prisma.invite.update({
    where: { id: inviteId },
    data: { revokedAt: new Date() },
  });

  revalidatePath(`/groups/${invite.groupId}`);
}

/** Redeem a join link. Safe to call twice — joining again is a no-op. */
export async function acceptInvite(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  const invite = await prisma.invite.findUnique({ where: { id: token } });
  if (!invite || invite.revokedAt || invite.expiresAt < new Date()) {
    redirect(`/invite/${token}`);
  }

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: invite.groupId, userId: user.id } },
    create: {
      groupId: invite.groupId,
      userId: user.id,
      role: invite.role,
      invitedViaId: invite.id,
    },
    update: {},
  });

  // Put them on the roster too, so occasions can be about them. `upsert` keeps
  // this idempotent if they were already added by name.
  await prisma.person
    .upsert({
      where: { groupId_userId: { groupId: invite.groupId, userId: user.id } },
      create: { groupId: invite.groupId, userId: user.id, name: user.name },
      update: {},
    })
    .catch(() => {});

  revalidatePath("/");
  redirect(`/groups/${invite.groupId}`);
}

export async function leaveGroup(formData: FormData): Promise<void> {
  const groupId = String(formData.get("groupId") ?? "");
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const role = await requireMembership(groupId);

  // The last owner can't walk out and strand the group without an admin.
  if (role === "OWNER") {
    const owners = await prisma.groupMember.count({
      where: { groupId, role: "OWNER" },
    });
    if (owners <= 1) {
      throw new Error(
        "You are the only owner. Make someone else an owner before leaving.",
      );
    }
  }

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId: user.id } },
  });

  revalidatePath("/");
  redirect("/groups");
}

/** Promote or demote a member. Owners only. */
export async function setMemberRole(formData: FormData): Promise<void> {
  const groupId = String(formData.get("groupId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!["OWNER", "ADMIN", "MEMBER"].includes(role)) return;

  const myRole = await requireMembership(groupId);
  if (myRole !== "OWNER") throw new NotAMemberError();

  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId } },
    data: { role: role as "OWNER" | "ADMIN" | "MEMBER" },
  });

  revalidatePath(`/groups/${groupId}`);
}

/** Remove someone else from the group. Admins and owners. */
export async function removeMember(formData: FormData): Promise<void> {
  const groupId = String(formData.get("groupId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  await requireGroupAdmin(groupId);

  const target = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!target) return;
  if (target.role === "OWNER") {
    throw new Error("An owner can't be removed. Demote them first.");
  }

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId } },
  });

  revalidatePath(`/groups/${groupId}`);
}

/** Convenience for pages: the group the user should land on by default. */
export async function getDefaultGroupId(): Promise<string | null> {
  const groups = await getMyGroups();
  return groups[0]?.id ?? null;
}
