"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fullName, nameFields } from "@/lib/auth/names";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { endOtherSessions, getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { personalDateTitle } from "@/lib/occasions/labels";
import { THEME_COOKIE, THEMES, type Theme } from "@/lib/theme";

export interface AccountFormState {
  error?: string;
}

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setTheme(theme: Theme): Promise<void> {
  if (!THEMES.includes(theme)) return;

  (await cookies()).set(THEME_COOKIE, theme, {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR,
    path: "/",
  });
}

const nameSchema = z.object(nameFields);
const emailSchema = z.string().trim().toLowerCase().email("That email doesn't look right.");
const passwordSchema = z.string().min(8, "Use at least 8 characters.");

/** Is this the signed-in user's password? Asked before anything sensitive changes. */
async function confirmPassword(userId: string, formData: FormData): Promise<boolean> {
  const { passwordHash } = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true },
  });
  return verifyPassword(String(formData.get("currentPassword") ?? ""), passwordHash);
}

export async function updateName(
  _previous: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = nameSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { firstName, lastName } = parsed.data;
  const name = fullName(firstName, lastName);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { name, firstName, lastName } });

    // Their entry on each group's list, and the dates they've shared, are
    // written under their name.
    await tx.person.updateMany({ where: { userId: user.id }, data: { name } });

    const dates = await tx.personalDate.findMany({
      where: { userId: user.id },
      select: { id: true, type: true, label: true, observedCalendar: true },
    });
    for (const date of dates) {
      await tx.event.updateMany({
        where: { personalDateId: date.id },
        data: { title: personalDateTitle(name, date) },
      });
    }
  });

  revalidatePath("/", "layout");
  return {};
}

export async function updateEmail(
  _previous: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data;

  if (!(await confirmPassword(user.id, formData))) {
    return { error: "That password isn't right." };
  }
  if (email === user.email) return {};

  const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (taken) return { error: "An account with that email already exists." };

  try {
    await prisma.user.update({ where: { id: user.id }, data: { email } });
  } catch {
    // Two people claiming the same address at once; the unique index decides.
    return { error: "An account with that email already exists." };
  }

  revalidatePath("/", "layout");
  return {};
}

export async function updatePassword(
  _previous: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = passwordSchema.safeParse(formData.get("newPassword"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (formData.get("confirmPassword") !== parsed.data) {
    return { error: "Those two passwords don't match." };
  }
  if (!(await confirmPassword(user.id, formData))) {
    return { error: "Your current password isn't right." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data) },
  });

  // If someone else had got in, this is what puts them out.
  await endOtherSessions(user.id);

  return {};
}
