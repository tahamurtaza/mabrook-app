import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db";

const COOKIE_NAME = "mabrook_session";
const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
  /** The full name. */
  name: string;
  firstName: string;
  /** Null only on accounts older than the field. */
  lastName: string | null;
  /** Hasn't finished or skipped the first-run guide yet. */
  tourPending: boolean;
}

/** Start a session for a user and set the cookie. */
export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: { id: randomBytes(32).toString("hex"), userId, expiresAt },
  });

  const store = await cookies();
  store.set(COOKIE_NAME, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

/**
 * The signed-in user, or null.
 *
 * Wrapped in `cache` so a page that checks auth in the layout and again in the
 * page body only hits Postgres once per request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const sessionId = store.get(COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    tourPending: session.user.tourCompletedAt === null,
  };
});

/** End the current session and clear the cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const sessionId = store.get(COOKIE_NAME)?.value;

  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  }
  store.delete(COOKIE_NAME);
}

/** Sign a user out everywhere but here, as after changing their password. */
export async function endOtherSessions(userId: string): Promise<void> {
  const store = await cookies();
  await prisma.session.deleteMany({
    where: { userId, id: { not: store.get(COOKIE_NAME)?.value } },
  });
}
