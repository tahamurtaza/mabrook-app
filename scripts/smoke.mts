/**
 * End-to-end smoke check against a running dev server.
 *
 * Exercises the group boundary specifically: an outsider must not be able to
 * read a group's calendar, its page, or attach its people to their own events.
 *
 *   npm run db:local & npm run dev & npx tsx scripts/smoke.mts
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { hashPassword } from "../src/lib/auth/password.js";

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

let failures = 0;

function check(name: string, passed: boolean, detail = "") {
  console.log(`${passed ? "  ok  " : " FAIL "} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) failures += 1;
}

async function sessionFor(userId: string) {
  const session = await prisma.session.create({
    data: {
      id: randomBytes(32).toString("hex"),
      userId,
      expiresAt: new Date(Date.now() + 3600_000),
    },
  });
  return `mabrook_session=${session.id}`;
}

function get(path: string, cookie?: string) {
  return fetch(`${BASE}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
}

async function text(path: string, cookie?: string) {
  return (await get(path, cookie)).text();
}

async function main() {
  const demo = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@mabrook.local" },
  });
  const family = await prisma.group.findFirstOrThrow({
    where: { name: "The Bombaywalas" },
  });
  const cricket = await prisma.group.findFirstOrThrow({
    where: { name: "Sunday cricket" },
  });

  // An outsider with an account but no groups.
  const outsider = await prisma.user.upsert({
    where: { email: "outsider@mabrook.local" },
    create: {
      email: "outsider@mabrook.local",
      name: "Outsider Test",
      firstName: "Outsider",
      lastName: "Test",
      passwordHash: await hashPassword("outsider123"),
    },
    update: {},
  });

  const demoCookie = await sessionFor(demo.id);
  const outsiderCookie = await sessionFor(outsider.id);

  console.log("\nSigned out");
  check("home redirects to login", (await get("/")).status === 307);

  console.log("\nMember, merged view");
  const home = await text("/", demoCookie);
  check("shows a family occasion", home.includes("Taha&#x27;s birthday"));
  check("shows a friends occasion", home.includes("Ali&#x27;s birthday"));
  check("labels rows with their group", home.includes("Sunday cricket"));
  check("reference Hijri date is right", (await text("/people", demoCookie)).includes("17 Zilqadah 1429"));

  console.log("\nMember, filtered to one group");
  const filtered = await text(`/?group=${cricket.id}`, demoCookie);
  check("keeps the selected group", filtered.includes("Ali&#x27;s birthday"));
  check("drops the other group", !filtered.includes("Taha&#x27;s birthday"));

  console.log("\nOutsider is walled off");
  const outsiderHome = await text("/", outsiderCookie);
  check("sees no occasions at all", !outsiderHome.includes("Taha&#x27;s birthday"));
  check("is prompted to make a group", outsiderHome.includes("not in a group yet"));

  const filterAttempt = await get(`/?group=${family.id}`, outsiderCookie);
  const filterBody = filterAttempt.status === 307 ? "" : await filterAttempt.text();
  check(
    "cannot read a group by guessing its id in ?group=",
    !filterBody.includes("Taha&#x27;s birthday"),
    `status ${filterAttempt.status}`,
  );

  const groupPage = await get(`/groups/${family.id}`, outsiderCookie);
  check(
    "cannot open the group page",
    groupPage.status === 404,
    `status ${groupPage.status}`,
  );

  const peoplePage = await text("/people", outsiderCookie);
  check("cannot see another group's roster", !peoplePage.includes("Murtaza"));

  console.log("\nInvites");
  const invite = await prisma.invite.create({
    data: {
      id: randomBytes(32).toString("base64url"),
      groupId: family.id,
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  const invitePage = await text(`/invite/${invite.id}`, outsiderCookie);
  check("invite page names the group", invitePage.includes("The Bombaywalas"));
  check("invite page offers to join", invitePage.includes("Join"));
  check(
    "invite page does not leak the calendar before joining",
    !invitePage.includes("Taha&#x27;s birthday"),
  );

  const expired = await prisma.invite.create({
    data: {
      id: randomBytes(32).toString("base64url"),
      groupId: family.id,
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  check(
    "expired invite is refused",
    (await text(`/invite/${expired.id}`, outsiderCookie)).includes("expired"),
  );
  check(
    "unknown invite token is refused",
    (await text("/invite/nope-not-a-real-token", outsiderCookie)).includes("expired"),
  );

  console.log("\nPersonal dates stay private");
  const privateDate = await prisma.personalDate.create({
    data: {
      userId: demo.id,
      type: "OTHER",
      label: "Smoke private date",
      gregorianYear: 2001,
      gregorianMonth: 2,
      gregorianDay: 3,
      hijriYear: 1421,
      hijriMonth: 10,
      hijriDay: 9,
    },
  });
  check("the owner sees it in Settings", (await text("/settings", demoCookie)).includes("Smoke private date"));
  check("nobody else does", !(await text("/settings", outsiderCookie)).includes("Smoke private date"));
  check(
    "it isn't offered on someone else's invite page",
    !invitePage.includes("Smoke private date") &&
      !(await text(`/invite/${invite.id}`, outsiderCookie)).includes("Smoke private date"),
  );
  check(
    "it stays off the group's calendar until shared",
    !(await text(`/groups/${family.id}`, demoCookie)).includes("Smoke private date"),
  );
  check("Settings needs a login", (await get("/settings")).status === 307);
  check("the welcome step needs a login", (await get("/welcome")).status === 307);
  await prisma.personalDate.delete({ where: { id: privateDate.id } });

  const claimPage = await get(`/groups/${family.id}/claim`, outsiderCookie);
  check("an outsider can't see who's on a group's list", claimPage.status === 404, `status ${claimPage.status}`);

  console.log("\nAfter joining");
  // The invite action itself is a server action; this asserts the state it
  // produces grants exactly what it should.
  await prisma.groupMember.create({
    data: { groupId: family.id, userId: outsider.id, invitedViaId: invite.id },
  });

  const joinedHome = await text("/", outsiderCookie);
  check("now sees the group's calendar", joinedHome.includes("Taha&#x27;s birthday"));
  check(
    "still cannot see a group they weren't invited to",
    !joinedHome.includes("Ali&#x27;s birthday"),
  );
  check(
    "can now open the group page",
    (await get(`/groups/${family.id}`, outsiderCookie)).status === 200,
  );
  check(
    "sees members of the group they joined",
    (await text(`/groups/${family.id}`, outsiderCookie)).includes("demo@mabrook.local"),
  );
  check(
    "as a plain member, gets no invite controls",
    !(await text(`/groups/${family.id}`, outsiderCookie)).includes("Create an invite link"),
  );

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId: family.id, userId: outsider.id } },
  });

  console.log("\nOpen redirect");
  const evil = await get("/login?next=https://evil.example", undefined);
  check("login with an external ?next still renders", evil.status === 200);

  await prisma.session.deleteMany({ where: { userId: outsider.id } });
  await prisma.invite.deleteMany({ where: { id: { in: [invite.id, expired.id] } } });

  console.log(
    failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
