"use client";

import { setMemberRole } from "@/app/actions/groups";

/** An owner's control for changing someone's role. Saves as soon as it changes. */
export function RoleSelect({
  groupId,
  userId,
  role,
}: {
  groupId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
}) {
  return (
    <form action={setMemberRole}>
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="userId" value={userId} />
      <label className="sr-only" htmlFor={`role-${userId}`}>
        Role
      </label>
      <select
        id={`role-${userId}`}
        name="role"
        defaultValue={role}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-line bg-surface px-1.5 py-1 text-xs text-muted outline-none transition-colors hover:border-line-strong focus:border-ink"
      >
        <option value="OWNER">Owner</option>
        <option value="ADMIN">Admin</option>
        <option value="MEMBER">Member</option>
      </select>
    </form>
  );
}
