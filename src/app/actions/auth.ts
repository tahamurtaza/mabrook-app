"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fullName, nameFields } from "@/lib/auth/names";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { safeNext } from "@/lib/safe-next";

export interface FormState {
  error?: string;
}


const signUpSchema = z.object({
  ...nameFields,
  email: z.string().trim().toLowerCase().email("That email doesn't look right."),
  password: z.string().min(8, "Use at least 8 characters."),
});

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("That email doesn't look right."),
  password: z.string().min(1, "Please enter your password."),
});

export async function signUp(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { firstName, lastName, email, password } = parsed.data;

  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return { error: "An account with that email already exists." };
  }

  const user = await prisma.user.create({
    data: {
      name: fullName(firstName, lastName),
      firstName,
      lastName,
      email,
      passwordHash: await hashPassword(password),
    },
  });

  await createSession(user.id);

  // First stop is their own dates, carrying on to wherever they were headed.
  const next = safeNext(formData.get("next"));
  redirect(next === "/" ? "/welcome" : `/welcome?next=${encodeURIComponent(next)}`);
}

export async function signIn(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // Same message either way, so the form can't be used to discover which
  // emails have accounts.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Wrong email or password." };
  }

  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/** Record that the first-run guide is done with, so it never comes back. */
export async function completeTour(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { tourCompletedAt: new Date() },
  });
}
