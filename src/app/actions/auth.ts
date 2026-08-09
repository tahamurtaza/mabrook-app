"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { safeNext } from "@/lib/safe-next";

export interface FormState {
  error?: string;
}


const signUpSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(80),
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
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, email, password } = parsed.data;

  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return { error: "An account with that email already exists." };
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });

  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
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
