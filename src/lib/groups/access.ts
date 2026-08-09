import { cache } from "react";
import type { GroupRole, GroupType } from "@/generated/prisma";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

/**
 * Every read and write of an occasion or a person must be scoped through this
 * module. Nothing else should build a `where` clause on `groupId` by hand — if
 * a query can't name the group it is allowed to touch, it shouldn't run.
 */

export interface MyGroup {
  id: string;
  name: string;
  type: GroupType;
  role: GroupRole;
  memberCount: number;
}

/** Thrown when a user asks for a group they aren't in. */
export class NotAMemberError extends Error {
  constructor() {
    super("You are not a member of that group.");
    this.name = "NotAMemberError";
  }
}

/** The signed-in user, or throw. Use in server actions. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in.");
  return user;
}

/**
 * The groups the signed-in user belongs to, newest membership last.
 * Cached per request — the layout, the page and the actions all ask for it.
 */
export const getMyGroups = cache(async (): Promise<MyGroup[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    orderBy: { joinedAt: "asc" },
    include: {
      group: {
        include: { _count: { select: { members: true } } },
      },
    },
  });

  return memberships.map((membership) => ({
    id: membership.group.id,
    name: membership.group.name,
    type: membership.group.type,
    role: membership.role,
    memberCount: membership.group._count.members,
  }));
});

/** Just the ids, for scoping `where` clauses. */
export async function getMyGroupIds(): Promise<string[]> {
  return (await getMyGroups()).map((group) => group.id);
}

/**
 * Confirm the user is in this group, and return their role.
 * Throws `NotAMemberError` for both "no such group" and "not a member", so the
 * two are indistinguishable to a caller probing for group ids.
 */
export async function requireMembership(groupId: string): Promise<GroupRole> {
  const groups = await getMyGroups();
  const group = groups.find((candidate) => candidate.id === groupId);
  if (!group) throw new NotAMemberError();
  return group.role;
}

/** Confirm the user can administer this group (invite, rename, remove). */
export async function requireGroupAdmin(groupId: string): Promise<GroupRole> {
  const role = await requireMembership(groupId);
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new NotAMemberError();
  }
  return role;
}

export function canAdminister(role: GroupRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}
